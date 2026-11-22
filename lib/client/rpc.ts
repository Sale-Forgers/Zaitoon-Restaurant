"use client";

import type { ApiArgs, ApiName, ApiResult } from "@/lib/server/rpc";
import { getGuest } from "./guest";
import { notifyChange } from "./live";

export class RpcError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Calls that only read: everything else tells the other screens to refresh. */
const READS = new Set<ApiName>([
  "menu.get",
  "push.key",
  "offers.list",
  "demo.info",
  "guest.state",
  "staff.me",
  "staff.board",
  "admin.overview",
  "admin.orders",
  "admin.settings.get",
  "admin.guests",
  "admin.feedback",
  "admin.campaigns",
]);

type Rest<K extends ApiName> = void extends ApiArgs<K> ? [args?: ApiArgs<K>] : [args: ApiArgs<K>];

export async function rpc<K extends ApiName>(fn: K, ...rest: Rest<K>): Promise<ApiResult<K>> {
  let res: Response;
  try {
    res = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ fn, args: rest[0] ?? null, guest: getGuest().creds }),
    });
  } catch {
    throw new RpcError("OFFLINE", "No connection. Please check your internet and try again.", 0);
  }
  let json: { ok: boolean; data?: unknown; error?: { code: string; message: string } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* handled below */
  }
  if (!json?.ok) {
    throw new RpcError(
      json?.error?.code ?? "SERVER_ERROR",
      json?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }
  if (!READS.has(fn)) notifyChange();
  return json.data as ApiResult<K>;
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
