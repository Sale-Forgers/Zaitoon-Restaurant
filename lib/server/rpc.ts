import "server-only";
import { bumpMenu, tableCode, C, getSettings, logEvent, resetDemo, uid, DAY } from "./db";
import { authGuest, safeEqual } from "./auth";
import {
  adminOverview,
  ApiError,
  closeVisit,
  createCall,
  guestState,
  joinVisit,
  markKotPrinted,
  placeOrder,
  pruneEvents,
  publicGuest,
  registerGuest,
  setOrderStatus,
  staffBoard,
  submitFeedback,
  tableByCode,
  tableById,
  updateCall,
  currentVisit,
} from "./logic";
import { sendToSubs, vapid } from "./push";
import type { Store } from "./store";
import type {
  Audience,
  Campaign,
  Category,
  Feedback,
  Guest,
  GuestPublic,
  Menu,
  MenuItem,
  Order,
  OrderLineInput,
  PushSub,
  Settings,
  StaffRole,
  StaffSession,
  TableDoc,
  Visit,
  WaiterCall,
} from "@/lib/types";

export interface Ctx {
  store: Store;
  guest: Guest | null;
  staff: StaffSession | null;
  userAgent: string | null;
  ip: string;
  /** Hostname the request came in on. */
  host: string;
  /** Set by login/logout: the route turns it into a cookie. */
  session?: StaffSession | null;
}

type Access = "public" | "guest" | "staff" | "admin";
interface Handler<A, R> {
  access: Access;
  run: (args: A, ctx: Ctx) => Promise<R>;
}
const def = <A, R>(access: Access, run: (args: A, ctx: Ctx) => Promise<R>): Handler<A, R> => ({ access, run });

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** How long a table scan lets a phone keep ordering. */
const SCAN_TTL = 6 * 3_600_000;

// Best-effort brake on PIN guessing (per server instance).
const attempts = new Map<string, { n: number; until: number }>();

function audienceFilter(audience: Audience, now: number) {
  return (g: Guest) => {
    if (!g.marketing) return false;
    if (audience === "recent") return g.lastSeenAt > now - 30 * DAY;
    if (audience === "loyal") return g.visits >= 3 || g.spent >= 10_000;
    return true;
  };
}

async function loadMenu(store: Store): Promise<Menu> {
  const [categories, items] = await Promise.all([store.all<Category>(C.categories), store.all<MenuItem>(C.items)]);
  return {
    categories: categories.sort((a, b) => a.sort - b.sort),
    items: items.sort((a, b) => a.sort - b.sort),
  };
}

export const api = {
  // ─────────────── Public ───────────────
  "menu.get": def("public", async (_: void, { store }) => loadMenu(store)),

  "push.key": def("public", async (_: void, { store }) => ({ key: (await vapid(store)).publicKey })),

  "offers.list": def("public", async (_: void, { store }) => {
    const all = await store.all<Campaign>(C.campaigns);
    return all
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, 12)
      .map((c) => ({ id: c.id, title: c.title, body: c.body, sentAt: c.sentAt }));
  }),

  /** What the pitch page needs to show a scannable demo table. */
  "demo.info": def("public", async (_: void, { store }) => {
    const tables = (await store.all<TableDoc>(C.tables)).filter((t) => t.active).sort((a, b) => a.number - b.number);
    const settings = await getSettings(store);
    // DEMO_MODE=off stops the public pitch page from handing out table codes.
    const open = process.env.DEMO_MODE !== "off";
    return {
      tables: (open ? tables.slice(0, 6) : []).map((t) => ({ number: t.number, zone: t.zone, code: t.code })),
      baseUrl: settings.baseUrl || "",
      durable: store.durable,
    };
  }),

  // ─────────────── Guest ───────────────
  /** Called once when the phone lands from a QR scan or NFC tap. */
  "guest.enter": def("public", async (a: { code: string }, { store, guest }) => {
    const table = await tableByCode(store, a?.code);
    if (guest) {
      await joinVisit(store, table, guest);
      guest = (await store.get<Guest>(C.guests, guest.id)) ?? guest;
      guest = { ...guest, scanTableId: table.id, scanAt: Date.now(), lastSeenAt: Date.now() };
      await store.put<Guest>(C.guests, guest);
    }
    return guestState(store, table, guest);
  }),

  "guest.state": def("public", async (a: { code: string }, { store, guest }) => {
    const table = await tableByCode(store, a?.code);
    return guestState(store, table, guest);
  }),

  "guest.register": def(
    "public",
    async (a: { code: string; name: string; phone?: string; marketing?: boolean }, { store, guest, userAgent }) => {
      const table = await tableByCode(store, a?.code);
      const saved = await registerGuest(store, table, a ?? {}, guest, userAgent);
      return {
        creds: { id: saved.id, token: saved.token },
        state: await guestState(store, table, saved),
      };
    },
  ),

  "guest.order": def(
    "guest",
    async (a: { code: string; lines: OrderLineInput[]; note?: string }, { store, guest }) => {
      const table = await tableByCode(store, a?.code);
      // Orders are only accepted from a phone that scanned this table recently,
      // so a photographed QR code cannot be used to order from elsewhere later.
      const fresh = guest!.scanTableId === table.id && Date.now() - (guest!.scanAt ?? 0) < SCAN_TTL;
      if (!fresh) {
        throw new ApiError("RESCAN", "Please scan the QR code on your table again to place an order.", 409);
      }
      const order = await placeOrder(store, { table, guest, inputs: a?.lines, note: a?.note, source: "qr" });
      return { order, state: await guestState(store, table, guest) };
    },
  ),

  "guest.call": def("public", async (a: { code: string; type: string; note?: string }, { store, guest }) => {
    const table = await tableByCode(store, a?.code);
    return createCall(store, { table, guest, type: a?.type, note: a?.note, origin: "guest" });
  }),

  "guest.feedback": def(
    "guest",
    async (
      a: { visitId?: string; food: number; service: number; ambience: number; comment?: string },
      { store, guest },
    ) => submitFeedback(store, guest!, a ?? {}),
  ),

  "guest.marketing": def("guest", async (a: { marketing: boolean }, { store, guest }) => {
    const updated = { ...guest!, marketing: Boolean(a?.marketing) };
    await store.put<Guest>(C.guests, updated);
    return publicGuest(updated);
  }),

  // ─────────────── Push subscriptions ───────────────
  "push.subscribe": def(
    "public",
    async (
      a: { sub: { endpoint: string; keys: { p256dh: string; auth: string } }; staff?: boolean },
      { store, guest, staff, userAgent },
    ) => {
      const endpoint = str(a?.sub?.endpoint, 1000);
      const p256dh = str(a?.sub?.keys?.p256dh, 200);
      const auth = str(a?.sub?.keys?.auth, 100);
      if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
        throw new ApiError("BAD_SUBSCRIPTION", "This browser did not return a valid push subscription.");
      }
      if (!guest && !staff) throw new ApiError("UNAUTHORIZED", "Please enter your name first.", 401);
      const { createHash } = await import("node:crypto");
      const id = createHash("sha256").update(endpoint).digest("base64url").slice(0, 22);
      // One device has one subscription. It can serve a guest (order updates) and,
      // when a staff screen asks for it, staff alerts as well.
      const existing = await store.get<PushSub>(C.subs, id);
      const sub: PushSub = {
        id,
        endpoint,
        keys: { p256dh, auth },
        guestId: guest?.id ?? existing?.guestId,
        staff: a?.staff && staff ? staff.role : existing?.staff,
        createdAt: existing?.createdAt ?? Date.now(),
        ua: userAgent?.slice(0, 160) ?? undefined,
      };
      await store.put(C.subs, sub);
      if (guest && !guest.pushEnabled) {
        await store.put<Guest>(C.guests, { ...guest, pushEnabled: true });
        await logEvent(store, "push", `${guest.name} enabled notifications on their phone`, guest.lastTable);
      }
      return { ok: true };
    },
  ),

  "push.unsubscribe": def("public", async (a: { endpoint: string }, { store }) => {
    const { createHash } = await import("node:crypto");
    const id = createHash("sha256").update(str(a?.endpoint, 1000)).digest("base64url").slice(0, 22);
    const sub = await store.get<PushSub>(C.subs, id);
    if (sub) {
      await store.del(C.subs, id);
      if (sub.guestId) {
        const others = (await store.all<PushSub>(C.subs)).some((s) => s.guestId === sub.guestId);
        const g = await store.get<Guest>(C.guests, sub.guestId);
        if (g && !others) await store.put<Guest>(C.guests, { ...g, pushEnabled: false });
      }
    }
    return { ok: true };
  }),

  // ─────────────── Staff session ───────────────
  "staff.login": def("public", async (a: { role: StaffRole; pin: string; name?: string }, ctx) => {
    const now = Date.now();
    const slot = attempts.get(ctx.ip);
    if (slot && slot.until > now && slot.n >= 8) {
      throw new ApiError("TOO_MANY_ATTEMPTS", "Too many wrong PINs. Please wait a few minutes.", 429);
    }
    const settings = await getSettings(ctx.store);
    const role = (["admin", "kitchen", "waiter"] as StaffRole[]).find((r) => r === a?.role);
    const pin = str(a?.pin, 12);
    if (!role || !pin || !safeEqual(settings.staff.pins[role], pin)) {
      attempts.set(ctx.ip, { n: slot && slot.until > now ? slot.n + 1 : 1, until: now + 5 * 60_000 });
      throw new ApiError("WRONG_PIN", "That PIN is not correct.", 401);
    }
    attempts.delete(ctx.ip);
    const fallback = role === "admin" ? "Manager" : role === "kitchen" ? "Kitchen" : settings.staff.waiters[0] ?? "Waiter";
    const session: StaffSession = { role, name: str(a?.name, 24) || fallback };
    ctx.session = session;
    return session;
  }),

  "staff.logout": def("public", async (_: void, ctx) => {
    ctx.session = null;
    return { ok: true };
  }),

  "staff.me": def("public", async (_: void, { staff, store, host }) => {
    const settings = await getSettings(store);
    const pins = settings.staff.pins;
    // The PIN pad shows the demo PINs only on a developer machine running the dev
    // server. A production build never reveals them, whatever the host header says
    // (a reverse proxy can make every request look like it came from localhost).
    const local =
      process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
    return {
      session: staff,
      waiters: settings.staff.waiters,
      restaurant: settings.restaurant.name,
      pinLength: { admin: pins.admin.length, kitchen: pins.kitchen.length, waiter: pins.waiter.length },
      hints: local ? pins : null,
    };
  }),

  // ─────────────── Staff operations ───────────────
  "staff.board": def("staff", async (_: void, { store }) => staffBoard(store)),

  "staff.order.status": def("staff", async (a: { id: string; status: string }, { store, staff }) =>
    setOrderStatus(store, a?.id, a?.status, staff!),
  ),

  "staff.order.create": def(
    "staff",
    async (a: { tableId: string; lines: OrderLineInput[]; note?: string; guestName?: string }, { store, staff }) => {
      const table = await tableById(store, a?.tableId);
      return placeOrder(store, {
        table,
        inputs: a?.lines,
        note: a?.note,
        source: "waiter",
        waiter: staff!.name,
        guestName: a?.guestName,
      });
    },
  ),

  "staff.order.kot": def("staff", async (a: { id: string }, { store }) => markKotPrinted(store, a?.id)),

  "staff.call.update": def("staff", async (a: { id: string; action: "ack" | "done" }, { store, staff }) =>
    updateCall(store, a?.id, a?.action, staff!),
  ),

  "staff.call.create": def("staff", async (a: { tableId: string; type?: string; note?: string }, { store, staff }) => {
    const table = await tableById(store, a?.tableId);
    return createCall(store, {
      table,
      type: a?.type ?? "waiter",
      note: a?.note,
      origin: staff!.role === "kitchen" ? "kitchen" : "admin",
      by: staff!.name,
    });
  }),

  "staff.visit.open": def("staff", async (a: { tableId: string }, { store }) => {
    const table = await tableById(store, a?.tableId);
    return joinVisit(store, table, null);
  }),

  "staff.visit.close": def("staff", async (a: { visitId: string }, { store, staff }) =>
    closeVisit(store, a?.visitId, staff!),
  ),

  // ─────────────── Admin ───────────────
  "admin.overview": def("admin", async (_: void, { store }) => {
    await pruneEvents(store);
    return adminOverview(store);
  }),

  "admin.orders": def("admin", async (a: { days?: number } | void, { store }) => {
    const days = int(a?.days, 1, 60, 7);
    const since = Date.now() - days * DAY;
    return (await store.all<Order>(C.orders)).filter((o) => o.createdAt >= since).sort((x, y) => y.createdAt - x.createdAt);
  }),

  "admin.settings.get": def("admin", async (_: void, { store }) => getSettings(store)),

  "admin.settings.save": def("admin", async (a: { patch: Partial<Settings> }, { store }) => {
    const cur = await getSettings(store);
    const p = a?.patch ?? {};
    const next: Settings = structuredClone(cur);
    if (p.restaurant) {
      next.restaurant = {
        name: str(p.restaurant.name ?? cur.restaurant.name, 80) || cur.restaurant.name,
        tagline: str(p.restaurant.tagline ?? cur.restaurant.tagline, 120),
        address: str(p.restaurant.address ?? cur.restaurant.address, 200),
        phone: str(p.restaurant.phone ?? cur.restaurant.phone, 40),
        hours: str(p.restaurant.hours ?? cur.restaurant.hours, 120),
      };
    }
    if (p.wifi) {
      const security = (["WPA", "WEP", "nopass"] as const).find((s) => s === p.wifi!.security) ?? cur.wifi.security;
      next.wifi = {
        enabled: p.wifi.enabled ?? cur.wifi.enabled,
        ssid: str(p.wifi.ssid ?? cur.wifi.ssid, 32),
        password: str(p.wifi.password ?? cur.wifi.password, 63),
        security,
      };
    }
    if (p.ordering) {
      next.ordering = {
        enabled: p.ordering.enabled ?? cur.ordering.enabled,
        servicePct: Math.max(0, Math.min(30, Number(p.ordering.servicePct ?? cur.ordering.servicePct) || 0)),
        taxPct: Math.max(0, Math.min(30, Number(p.ordering.taxPct ?? cur.ordering.taxPct) || 0)),
        taxLabel: str(p.ordering.taxLabel ?? cur.ordering.taxLabel, 12) || "Tax",
      };
    }
    if (p.kitchen) {
      next.kitchen = {
        autoPrintKot: p.kitchen.autoPrintKot ?? cur.kitchen.autoPrintKot,
        targetMinutes: int(p.kitchen.targetMinutes, 5, 90, cur.kitchen.targetMinutes),
      };
    }
    if (p.notifications) {
      next.notifications = {
        orderUpdates: p.notifications.orderUpdates ?? cur.notifications.orderUpdates,
        feedbackRequest: p.notifications.feedbackRequest ?? cur.notifications.feedbackRequest,
      };
    }
    if (p.staff) {
      if (Array.isArray(p.staff.waiters)) {
        const names = [...new Set(p.staff.waiters.map((w) => str(w, 24)).filter(Boolean))].slice(0, 20);
        if (names.length) next.staff.waiters = names;
      }
      for (const role of ["admin", "kitchen", "waiter"] as StaffRole[]) {
        const pin = p.staff.pins?.[role];
        if (pin === undefined || pin === "") continue;
        if (!/^\d{4,6}$/.test(String(pin))) throw new ApiError("BAD_PIN", "PINs must be 4 to 6 digits.");
        next.staff.pins[role] = String(pin);
      }
    }
    if (p.baseUrl !== undefined) {
      const url = str(p.baseUrl, 200).replace(/\/+$/, "");
      if (url && !/^https?:\/\/[^\s/]+/.test(url)) throw new ApiError("BAD_URL", "The public address must start with http:// or https://");
      next.baseUrl = url || undefined;
    }
    await store.put(C.settings, next);
    await logEvent(store, "system", "Settings updated from the admin panel");
    return next;
  }),

  "admin.table.save": def(
    "admin",
    async (a: { id?: string; number: number; label?: string; zone?: string; seats?: number; active?: boolean }, { store }) => {
      const tables = await store.all<TableDoc>(C.tables);
      const number = int(a?.number, 1, 999, 0);
      if (!number) throw new ApiError("BAD_NUMBER", "Please give the table a number.");
      const existing = a?.id ? tables.find((t) => t.id === a.id) : undefined;
      if (tables.some((t) => t.number === number && t.id !== existing?.id)) {
        throw new ApiError("DUPLICATE", `Table ${number} already exists.`);
      }
      const table: TableDoc = {
        id: existing?.id ?? `t-${uid(4)}`,
        number,
        label: str(a?.label, 30) || `Table ${number}`,
        zone: str(a?.zone, 30) || existing?.zone || "Family Hall",
        seats: int(a?.seats, 1, 40, existing?.seats ?? 4),
        code: existing?.code ?? tableCode(),
        active: a?.active ?? existing?.active ?? true,
        visitSeq: existing?.visitSeq ?? 0,
      };
      await store.put(C.tables, table);
      return table;
    },
  ),

  "admin.table.delete": def("admin", async (a: { id: string }, { store }) => {
    const table = await tableById(store, a?.id);
    if (await currentVisit(store, table)) {
      throw new ApiError("TABLE_BUSY", "Close this table's bill before removing it.");
    }
    await store.del(C.tables, table.id);
    return { ok: true };
  }),

  /** New QR/NFC code for a table: the old printed code stops working. */
  "admin.table.rotate": def("admin", async (a: { id: string }, { store }) => {
    const table = await tableById(store, a?.id);
    const updated = { ...table, code: tableCode() };
    await store.put(C.tables, updated);
    return updated;
  }),

  "admin.item.save": def("admin", async (a: { item: Partial<MenuItem> }, { store }) => {
    const input = a?.item ?? {};
    const categories = await store.all<Category>(C.categories);
    const categoryId = str(input.categoryId, 60);
    if (!categories.some((c) => c.id === categoryId)) throw new ApiError("BAD_CATEGORY", "Please choose a category.");
    const name = str(input.name, 80);
    if (name.length < 2) throw new ApiError("NAME_REQUIRED", "Please give the dish a name.");
    const items = await store.all<MenuItem>(C.items);
    const existing = input.id ? items.find((i) => i.id === input.id) : undefined;

    const variants = (input.variants ?? [])
      .map((v) => ({ id: slug(str(v.name, 30)) || uid(3), name: str(v.name, 30), price: int(v.price, 0, 1_000_000, 0) }))
      .filter((v) => v.name)
      .slice(0, 8);
    const choices = (input.choices ?? [])
      .map((g) => ({
        id: slug(str(g.name, 30)) || uid(3),
        name: str(g.name, 30),
        options: (g.options ?? []).map((o) => str(o, 30)).filter(Boolean).slice(0, 10),
      }))
      .filter((g) => g.name && g.options.length)
      .slice(0, 5);
    const extras = (input.extras ?? [])
      .map((e) => ({ id: slug(str(e.name, 40)) || uid(3), name: str(e.name, 40), price: int(e.price, 0, 100_000, 0) }))
      .filter((e) => e.name)
      .slice(0, 10);
    const image = str(input.image, 60);

    const item: MenuItem = {
      id: existing?.id ?? `${categoryId}-${slug(name)}-${uid(3)}`,
      categoryId,
      name,
      desc: str(input.desc, 300) || undefined,
      price: variants.length ? Math.min(...variants.map((v) => v.price)) : int(input.price, 0, 1_000_000, 0),
      image: /^[a-z0-9-]+$/.test(image) ? image : undefined,
      popular: Boolean(input.popular) || undefined,
      spicy: Boolean(input.spicy) || undefined,
      unit: str(input.unit, 20) || undefined,
      available: input.available ?? existing?.available ?? true,
      sort: existing?.sort ?? Math.max(0, ...items.map((i) => i.sort)) + 1,
      variants: variants.length ? variants : undefined,
      choices: choices.length ? choices : undefined,
      extras: extras.length ? extras : undefined,
    };
    await store.put(C.items, item);
    await bumpMenu(store);
    return item;
  }),

  "admin.item.available": def("admin", async (a: { id: string; available: boolean }, { store }) => {
    const item = await store.get<MenuItem>(C.items, str(a?.id, 120));
    if (!item) throw new ApiError("ITEM_NOT_FOUND", "Dish not found.", 404);
    const updated = { ...item, available: Boolean(a?.available) };
    await store.put(C.items, updated);
    await bumpMenu(store);
    return updated;
  }),

  "admin.item.delete": def("admin", async (a: { id: string }, { store }) => {
    await store.del(C.items, str(a?.id, 120));
    await bumpMenu(store);
    return { ok: true };
  }),

  "admin.category.save": def("admin", async (a: { id?: string; name: string }, { store }) => {
    const name = str(a?.name, 40);
    if (name.length < 2) throw new ApiError("NAME_REQUIRED", "Please name the category.");
    const categories = await store.all<Category>(C.categories);
    const existing = a?.id ? categories.find((c) => c.id === a.id) : undefined;
    const category: Category = existing
      ? { ...existing, name }
      : { id: `${slug(name)}-${uid(3)}`, name, sort: Math.max(0, ...categories.map((c) => c.sort)) + 1 };
    await store.put(C.categories, category);
    await bumpMenu(store);
    return category;
  }),

  "admin.category.delete": def("admin", async (a: { id: string }, { store }) => {
    const id = str(a?.id, 80);
    if ((await store.all<MenuItem>(C.items)).some((i) => i.categoryId === id)) {
      throw new ApiError("CATEGORY_IN_USE", "Move or delete the dishes in this category first.");
    }
    await store.del(C.categories, id);
    await bumpMenu(store);
    return { ok: true };
  }),

  "admin.guests": def("admin", async (_: void, { store }) => {
    const [guests, subs] = await Promise.all([store.all<Guest>(C.guests), store.all<PushSub>(C.subs)]);
    const devices = new Map<string, number>();
    for (const s of subs) if (s.guestId) devices.set(s.guestId, (devices.get(s.guestId) ?? 0) + 1);
    const list: (GuestPublic & { devices: number })[] = guests
      .map((g) => ({
        ...publicGuest(g),
        devices: devices.get(g.id) ?? 0,
        pushEnabled: g.sample ? g.pushEnabled : (devices.get(g.id) ?? 0) > 0,
      }))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return list;
  }),

  "admin.feedback": def("admin", async (_: void, { store }) =>
    (await store.all<Feedback>(C.feedback)).sort((a, b) => b.createdAt - a.createdAt),
  ),

  "admin.campaigns": def("admin", async (_: void, { store }) => {
    const now = Date.now();
    const [campaigns, guests, subs] = await Promise.all([
      store.all<Campaign>(C.campaigns),
      store.all<Guest>(C.guests),
      store.all<PushSub>(C.subs),
    ]);
    const reachable = new Set(subs.map((s) => s.guestId).filter(Boolean));
    const reach = (aud: Audience) => guests.filter((g) => reachable.has(g.id)).filter(audienceFilter(aud, now)).length;
    return {
      campaigns: campaigns.sort((a, b) => b.sentAt - a.sentAt),
      reach: { all: reach("all"), recent: reach("recent"), loyal: reach("loyal") },
      subscribers: reachable.size,
    };
  }),

  "admin.campaign.send": def("admin", async (a: { title: string; body: string; audience: Audience }, { store }) => {
    const title = str(a?.title, 60);
    const body = str(a?.body, 180);
    if (title.length < 3 || body.length < 3) throw new ApiError("MESSAGE_REQUIRED", "Please write a title and a message.");
    const audience = (["all", "recent", "loyal"] as Audience[]).find((x) => x === a?.audience) ?? "all";
    const now = Date.now();
    const [guests, subs] = await Promise.all([store.all<Guest>(C.guests), store.all<PushSub>(C.subs)]);
    const ids = new Set(guests.filter(audienceFilter(audience, now)).map((g) => g.id));
    const targets = subs.filter((s) => s.guestId && ids.has(s.guestId));
    const id = uid();
    const res = await sendToSubs(
      store,
      targets,
      { title, body, url: `/offers?c=${id}`, tag: `promo-${id}`, kind: "promo" },
      { ttl: 24 * 3600, urgency: "normal" },
    );
    const campaign: Campaign = {
      id,
      title,
      body,
      audience,
      sentAt: now,
      targeted: targets.length,
      delivered: res.sent,
      failed: res.failed,
    };
    await store.put(C.campaigns, campaign);
    await logEvent(store, "push", `Promotion “${title}” sent to ${res.sent} of ${targets.length} devices`);
    return campaign;
  }),

  "admin.push.test": def("admin", async (_: void, { store }) => {
    const subs = (await store.all<PushSub>(C.subs)).filter((s) => s.guestId);
    return sendToSubs(
      store,
      subs,
      {
        title: "Zaitoon notifications are working",
        body: "This is a test message from the admin panel.",
        url: "/orders",
        tag: "test",
        kind: "test",
      },
      { ttl: 120, urgency: "high" },
    );
  }),

  // ─────────────── Demo tools ───────────────
  "admin.demo.order": def("admin", async (_: void, { store }) => {
    const tables = (await store.all<TableDoc>(C.tables)).filter((t) => t.active);
    const items = (await store.all<MenuItem>(C.items)).filter((i) => i.available);
    const names = ["Ahmed Raza", "Sara Iqbal", "Hamza Butt", "Noor Fatima", "Danish Ali", "Mehwish Khan"];
    const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
    const table = pick(tables);
    const popular = items.filter((i) => i.popular);
    const chosen = new Map<string, OrderLineInput>();
    const want = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < 12 && chosen.size < want; i++) {
      const item = chosen.size === 0 ? pick(popular.length ? popular : items) : pick(items);
      chosen.set(item.id, {
        itemId: item.id,
        qty: 1 + Math.floor(Math.random() * 2),
        variantId: item.variants?.length ? pick(item.variants).id : undefined,
      });
    }
    return placeOrder(store, {
      table,
      inputs: [...chosen.values()],
      source: "qr",
      guestName: pick(names),
    });
  }),

  "admin.demo.call": def("admin", async (_: void, { store }) => {
    const tables = (await store.all<TableDoc>(C.tables)).filter((t) => t.active);
    const visits = (await store.all<Visit>(C.visits)).filter((v) => v.status === "open");
    const busy = tables.filter((t) => visits.some((v) => v.tableId === t.id));
    const pool = busy.length ? busy : tables;
    const table = pool[Math.floor(Math.random() * pool.length)];
    const types = ["waiter", "waiter", "water", "bill"];
    const call: WaiterCall = await createCall(store, {
      table,
      type: types[Math.floor(Math.random() * types.length)],
      origin: "guest",
      by: "Guest",
    });
    return call;
  }),

  "admin.demo.reset": def("admin", async (a: { samples?: boolean } | void) => {
    await resetDemo(a?.samples !== false);
    return { ok: true };
  }),

  "admin.demo.clearSamples": def("admin", async (_: void, { store }) => {
    for (const col of [C.guests, C.visits, C.orders, C.feedback, C.campaigns]) {
      const docs = await store.all<{ id: string; sample?: boolean }>(col);
      await store.delMany(
        col,
        docs.filter((d) => d.sample).map((d) => d.id),
      );
    }
    await logEvent(store, "system", "Sample history removed: only real activity remains");
    return { ok: true };
  }),
};

export type Api = typeof api;
export type ApiName = keyof Api;
export type ApiArgs<K extends ApiName> = Parameters<Api[K]["run"]>[0];
export type ApiResult<K extends ApiName> = Awaited<ReturnType<Api[K]["run"]>>;

export async function dispatch(name: string, args: unknown, ctx: Ctx): Promise<unknown> {
  const handler = (api as Record<string, Handler<unknown, unknown>>)[name];
  if (!handler) throw new ApiError("UNKNOWN_METHOD", "Unknown request.", 404);
  if (handler.access === "guest" && !ctx.guest) {
    throw new ApiError("GUEST_REQUIRED", "Please enter your name to continue.", 401);
  }
  if (handler.access === "staff" && !ctx.staff) {
    throw new ApiError("STAFF_REQUIRED", "Please sign in with your staff PIN.", 401);
  }
  if (handler.access === "admin" && ctx.staff?.role !== "admin") {
    throw new ApiError("ADMIN_REQUIRED", "Only the manager can do this.", ctx.staff ? 403 : 401);
  }
  return handler.run(args, ctx);
}

export { authGuest };
