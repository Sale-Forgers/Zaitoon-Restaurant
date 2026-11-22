import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Pool as PgPool } from "pg";

/**
 * A tiny document store with two drivers:
 *
 *  • file     – zero-config JSON file in ./.data, used for local runs and demos.
 *  • postgres – used whenever DATABASE_URL / POSTGRES_URL is set (Vercel + Neon,
 *               Supabase, or any other Postgres). Documents live in one JSONB table.
 *
 * Every write bumps a global version counter. Screens poll that counter and
 * refetch when it changes, which is what keeps kitchen, waiter, admin and guest
 * views in sync without websockets (so it also works on serverless hosting).
 */
export interface Doc {
  id: string;
}

export interface Store {
  kind: "file" | "postgres";
  /** False when data can vanish (e.g. serverless host without a database). */
  durable: boolean;
  label: string;
  all<T extends Doc>(col: string): Promise<T[]>;
  get<T extends Doc>(col: string, id: string): Promise<T | null>;
  put<T extends Doc>(col: string, doc: T): Promise<void>;
  putMany<T extends Doc>(col: string, docs: T[]): Promise<void>;
  del(col: string, id: string): Promise<void>;
  delMany(col: string, ids: string[]): Promise<void>;
  /** Removes one collection, or everything (including counters) when omitted. */
  clear(col?: string): Promise<void>;
  /** Atomic counter: returns 1, 2, 3… (or jumps ahead by `by`). */
  seq(name: string, by?: number): Promise<number>;
  version(): Promise<number>;
}

// ───────────────────────────── File driver ─────────────────────────────

interface FileShape {
  v: number;
  seq: Record<string, number>;
  cols: Record<string, Record<string, Doc>>;
}

class FileStore implements Store {
  kind = "file" as const;
  durable: boolean;
  label: string;
  private file: string;
  private data: FileShape = { v: 1, seq: {}, cols: {} };
  private mtime = 0;

  constructor(dir: string, durable: boolean) {
    this.durable = durable;
    this.file = path.join(dir, "zaitoon-data.json");
    this.label = durable ? "Local file (.data/zaitoon-data.json)" : "Temporary storage";
    fs.mkdirSync(dir, { recursive: true });
    this.sync();
  }

  /** Reload when another process (or a dev-server worker) wrote the file. */
  private sync() {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.file);
    } catch {
      return;
    }
    if (stat.mtimeMs === this.mtime) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8")) as FileShape;
      if (parsed && typeof parsed === "object" && parsed.cols) {
        this.data = { v: parsed.v ?? 1, seq: parsed.seq ?? {}, cols: parsed.cols };
        this.mtime = stat.mtimeMs;
      }
    } catch {
      // A half-written or corrupt file: keep what we have in memory.
    }
  }

  private persist() {
    this.data.v += 1;
    const tmp = `${this.file}.${process.pid}.tmp`;
    const json = JSON.stringify(this.data);
    try {
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, this.file);
    } catch {
      // Windows can refuse the rename while another process holds the file.
      try {
        fs.writeFileSync(this.file, json);
        fs.rmSync(tmp, { force: true });
      } catch {
        /* keep serving from memory */
      }
    }
    try {
      this.mtime = fs.statSync(this.file).mtimeMs;
    } catch {
      /* ignore */
    }
  }

  private col(name: string) {
    return (this.data.cols[name] ??= {});
  }

  async all<T extends Doc>(col: string) {
    this.sync();
    return Object.values(this.col(col)).map((d) => structuredClone(d)) as T[];
  }
  async get<T extends Doc>(col: string, id: string) {
    this.sync();
    const d = this.col(col)[id];
    return d ? (structuredClone(d) as T) : null;
  }
  async put<T extends Doc>(col: string, doc: T) {
    this.sync();
    this.col(col)[doc.id] = structuredClone(doc);
    this.persist();
  }
  async putMany<T extends Doc>(col: string, docs: T[]) {
    if (!docs.length) return;
    this.sync();
    const c = this.col(col);
    for (const d of docs) c[d.id] = structuredClone(d);
    this.persist();
  }
  async del(col: string, id: string) {
    this.sync();
    delete this.col(col)[id];
    this.persist();
  }
  async delMany(col: string, ids: string[]) {
    if (!ids.length) return;
    this.sync();
    const c = this.col(col);
    for (const id of ids) delete c[id];
    this.persist();
  }
  async clear(col?: string) {
    this.sync();
    if (col) delete this.data.cols[col];
    else this.data = { v: this.data.v, seq: {}, cols: {} };
    this.persist();
  }
  async seq(name: string, by = 1) {
    this.sync();
    const n = (this.data.seq[name] ?? 0) + by;
    this.data.seq[name] = n;
    this.persist();
    return n;
  }
  async version() {
    this.sync();
    return this.data.v;
  }
}

// ───────────────────────────── Postgres driver ─────────────────────────────

const BUMP = `INSERT INTO zr_meta(key, n) VALUES ('version', 1)
  ON CONFLICT (key) DO UPDATE SET n = zr_meta.n + 1`;

class PostgresStore implements Store {
  kind = "postgres" as const;
  durable = true;
  label = "PostgreSQL";
  private pool: PgPool;
  private ready: Promise<void> | null = null;

  constructor(pool: PgPool) {
    this.pool = pool;
  }

  private init() {
    const schema = `CREATE TABLE IF NOT EXISTS zr_docs (
           col  text        NOT NULL,
           id   text        NOT NULL,
           data jsonb       NOT NULL,
           ts   timestamptz NOT NULL DEFAULT now(),
           PRIMARY KEY (col, id)
         );
         CREATE TABLE IF NOT EXISTS zr_meta (
           key text   PRIMARY KEY,
           n   bigint NOT NULL DEFAULT 0
         );`;
    this.ready ??= this.pool
      .query(schema)
      // Two cold instances can race on CREATE TABLE: the loser simply retries.
      .catch(() => this.pool.query(schema))
      .then(() => undefined)
      .catch((err) => {
        this.ready = null;
        throw err;
      });
    return this.ready;
  }

  private async q<R>(text: string, params: unknown[] = []): Promise<R[]> {
    await this.init();
    const res = await this.pool.query(text, params);
    return res.rows as R[];
  }

  async all<T extends Doc>(col: string): Promise<T[]> {
    const rows = await this.q<{ data: T }>("SELECT data FROM zr_docs WHERE col = $1", [col]);
    return rows.map((r) => r.data);
  }
  async get<T extends Doc>(col: string, id: string): Promise<T | null> {
    const rows = await this.q<{ data: T }>(
      "SELECT data FROM zr_docs WHERE col = $1 AND id = $2",
      [col, id],
    );
    return rows.length ? rows[0].data : null;
  }
  async put<T extends Doc>(col: string, doc: T) {
    await this.q(
      `WITH up AS (
         INSERT INTO zr_docs(col, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, ts = now()
       ) ${BUMP}`,
      [col, doc.id, JSON.stringify(doc)],
    );
  }
  async putMany<T extends Doc>(col: string, docs: T[]) {
    if (!docs.length) return;
    await this.q(
      `WITH up AS (
         INSERT INTO zr_docs(col, id, data)
         SELECT $1, d->>'id', d FROM jsonb_array_elements($2::jsonb) AS d
         ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, ts = now()
       ) ${BUMP}`,
      [col, JSON.stringify(docs)],
    );
  }
  async del(col: string, id: string) {
    await this.q(
      `WITH gone AS (DELETE FROM zr_docs WHERE col = $1 AND id = $2) ${BUMP}`,
      [col, id],
    );
  }
  async delMany(col: string, ids: string[]) {
    if (!ids.length) return;
    await this.q(
      `WITH gone AS (DELETE FROM zr_docs WHERE col = $1 AND id = ANY($2::text[])) ${BUMP}`,
      [col, ids],
    );
  }
  async clear(col?: string) {
    if (col) {
      await this.q(`WITH gone AS (DELETE FROM zr_docs WHERE col = $1) ${BUMP}`, [col]);
    } else {
      await this.q("DELETE FROM zr_docs");
      await this.q("DELETE FROM zr_meta WHERE key <> 'version'");
      await this.q(BUMP);
    }
  }
  async seq(name: string, by = 1) {
    const rows = await this.q<{ n: string }>(
      `INSERT INTO zr_meta(key, n) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET n = zr_meta.n + $2
       RETURNING n`,
      [`seq:${name}`, by],
    );
    return Number(rows[0].n);
  }
  async version() {
    const rows = await this.q<{ n: string }>("SELECT n FROM zr_meta WHERE key = 'version'");
    return rows[0] ? Number(rows[0].n) : 0;
  }
}

// ───────────────────────────── Selection ─────────────────────────────

const g = globalThis as unknown as { __zrStore?: Promise<Store> };

export function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    undefined
  );
}

async function create(): Promise<Store> {
  const url = databaseUrl();
  if (url) {
    const { Pool } = await import("pg");
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
    // Hosted Postgres needs TLS. Supabase's certificates are signed by their own
    // CA, so verification is relaxed unless DATABASE_SSL=strict is set.
    const sslMode = process.env.DATABASE_SSL ?? (local ? "off" : "relaxed");
    u.searchParams.delete("sslmode");
    const pool = new Pool({
      connectionString: u.toString(),
      max: Number(process.env.DATABASE_POOL_MAX) || 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl:
        sslMode === "off"
          ? false
          : { rejectUnauthorized: sslMode === "strict" },
    });
    pool.on("error", () => {
      /* idle client errors must not crash the process */
    });
    return new PostgresStore(pool);
  }
  // Serverless hosts only allow writes to the temp folder, and it is not shared
  // or kept: fine for a first look, but a database is needed for a real demo.
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : serverless
      ? path.join("/tmp", "zaitoon")
      : path.join(process.cwd(), ".data");
  return new FileStore(dir, !serverless);
}

export function getStore(): Promise<Store> {
  g.__zrStore ??= create().catch((err) => {
    g.__zrStore = undefined;
    throw err;
  });
  return g.__zrStore;
}
