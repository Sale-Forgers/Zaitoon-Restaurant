import "server-only";
import { CALL_SHORT, firstName, rs } from "@/lib/format";
import { billFor, priceLine } from "@/lib/pricing";
import { dateKey, DAY_MS, hourOf, shortDate, startOfDay, weekdayLabel } from "@/lib/time";
import {
  ORDER_FLOW,
  type ActivityEvent,
  type AdminOverview,
  type Bill,
  type CallType,
  type Feedback,
  type Guest,
  type GuestPublic,
  type GuestSettings,
  type GuestState,
  type MenuItem,
  type Order,
  type OrderLineInput,
  type OrderStatus,
  type PushSub,
  type Settings,
  type StaffBoard,
  type StaffSession,
  type StaffSettings,
  type TableDoc,
  type TableState,
  type TableView,
  type Visit,
  type WaiterCall,
} from "@/lib/types";
import { C, getSettings, logEvent, menuRev, MIN, uid } from "./db";
import { pushToGuests, pushToStaff } from "./push";
import type { Store } from "./store";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const ACTIVE: OrderStatus[] = ["received", "preparing", "ready", "picked_up"];

// ───────────────────────────── Tables & visits ─────────────────────────────

export async function tableByCode(store: Store, code: unknown): Promise<TableDoc> {
  const c = String(code ?? "").trim().toLowerCase();
  const table = c ? (await store.all<TableDoc>(C.tables)).find((t) => t.code === c) : undefined;
  if (!table || !table.active) {
    throw new ApiError("TABLE_NOT_FOUND", "This table code is not valid. Please scan the QR on your table again.", 404);
  }
  return table;
}

export async function tableById(store: Store, id: unknown): Promise<TableDoc> {
  const table = await store.get<TableDoc>(C.tables, String(id ?? ""));
  if (!table) throw new ApiError("TABLE_NOT_FOUND", "Table not found.", 404);
  return table;
}

const visitIdFor = (t: TableDoc) => `${t.id}.${t.visitSeq ?? 0}`;

export async function currentVisit(store: Store, table: TableDoc): Promise<Visit | null> {
  const v = await store.get<Visit>(C.visits, visitIdFor(table));
  return v && v.status === "open" ? v : null;
}

/** Opens the table's visit if needed and adds the guest to it. */
export async function joinVisit(store: Store, table: TableDoc, guest?: Guest | null): Promise<Visit> {
  let visit = await currentVisit(store, table);
  let changed = false;
  if (!visit) {
    visit = {
      id: visitIdFor(table),
      tableId: table.id,
      tableNumber: table.number,
      status: "open",
      openedAt: Date.now(),
      guestIds: [],
      guestNames: [],
    };
    changed = true;
  }
  if (guest && !visit.guestIds.includes(guest.id)) {
    visit.guestIds.push(guest.id);
    visit.guestNames.push(guest.name);
    changed = true;
    await store.put<Guest>(C.guests, {
      ...guest,
      visits: guest.visits + 1,
      lastSeenAt: Date.now(),
      lastTable: table.number,
    });
  }
  if (changed) await store.put(C.visits, visit);
  return visit;
}

function billOfOrders(orders: Order[], settings: Settings): Bill {
  const live = orders.filter((o) => o.status !== "cancelled");
  const base = billFor(0, settings.ordering);
  return {
    ...base,
    subtotal: live.reduce((a, o) => a + o.subtotal, 0),
    service: live.reduce((a, o) => a + o.service, 0),
    tax: live.reduce((a, o) => a + o.tax, 0),
    total: live.reduce((a, o) => a + o.total, 0),
  };
}

// ───────────────────────────── Guests ─────────────────────────────

export const publicGuest = (g: Guest): GuestPublic => {
  const { token: _token, ...rest } = g;
  void _token;
  return rest;
};

export function guestSettings(s: Settings): GuestSettings {
  return { restaurant: s.restaurant, wifi: s.wifi, ordering: s.ordering };
}

export function staffSettings(s: Settings): StaffSettings {
  return { ...s, staff: { waiters: s.staff.waiters } };
}

function deviceLabel(ua: string | null | undefined) {
  const u = ua ?? "";
  if (/iPhone|iPad|iPod/i.test(u)) return "iPhone";
  if (/Android/i.test(u)) return "Android";
  if (/Windows/i.test(u)) return "Windows";
  if (/Macintosh|Mac OS/i.test(u)) return "Mac";
  return "Browser";
}

export async function registerGuest(
  store: Store,
  table: TableDoc,
  input: { name?: unknown; phone?: unknown; marketing?: unknown },
  existing: Guest | null,
  ua?: string | null,
): Promise<Guest> {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (name.length < 2) throw new ApiError("NAME_REQUIRED", "Please tell us your name.");
  const phone = String(input.phone ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 20) || undefined;
  const marketing = input.marketing !== false;
  const now = Date.now();

  let guest: Guest;
  if (existing) {
    guest = {
      ...existing,
      name,
      phone: phone ?? existing.phone,
      marketing,
      lastSeenAt: now,
      scanTableId: table.id,
      scanAt: now,
    };
    await store.put(C.guests, guest);
  } else {
    guest = {
      id: uid(),
      token: uid(24),
      name,
      phone,
      marketing,
      createdAt: now,
      lastSeenAt: now,
      visits: 0,
      orders: 0,
      spent: 0,
      pushEnabled: false,
      lastTable: table.number,
      scanTableId: table.id,
      scanAt: now,
      device: deviceLabel(ua),
    };
    await store.put(C.guests, guest);
    await logEvent(store, "guest", `${name} joined Table ${table.number} by scanning the table code`, table.number);
  }
  await joinVisit(store, table, guest);
  return (await store.get<Guest>(C.guests, guest.id)) ?? guest;
}

export async function guestState(store: Store, table: TableDoc, guest: Guest | null): Promise<GuestState> {
  // Read-only on purpose: phones poll this, and polling must never reopen a
  // table that staff have just closed. Joining happens on scan and on ordering.
  const settings = await getSettings(store);
  const visit = await currentVisit(store, table);

  const allOrders = visit ? (await store.all<Order>(C.orders)).filter((o) => o.visitId === visit!.id) : [];
  allOrders.sort((a, b) => b.createdAt - a.createdAt);
  const calls = visit
    ? (await store.all<WaiterCall>(C.calls))
        .filter((c) => c.visitId === visit!.id && c.status !== "done")
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  let pendingFeedback: GuestState["pendingFeedback"] = null;
  let recentVisit: GuestState["recentVisit"] = null;
  let feedbackGiven = false;
  if (guest) {
    const feedback = (await store.all<Feedback>(C.feedback)).filter((f) => f.guestId === guest!.id);
    feedbackGiven = Boolean(visit && feedback.some((f) => f.visitId === visit!.id));
    const since = Date.now() - DAY_MS / 2;
    const last = (await store.all<Visit>(C.visits))
      .filter((v) => v.status === "closed" && (v.closedAt ?? 0) > since && v.guestIds.includes(guest!.id))
      .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))[0];
    if (last) {
      recentVisit = { tableNumber: last.tableNumber, closedAt: last.closedAt ?? 0, total: last.total ?? 0 };
      if (!feedback.some((f) => f.visitId === last.id)) {
        pendingFeedback = { visitId: last.id, tableNumber: last.tableNumber, closedAt: last.closedAt ?? 0 };
      }
    }
  }

  return {
    table: { id: table.id, number: table.number, label: table.label, zone: table.zone },
    guest: guest ? publicGuest(guest) : null,
    settings: guestSettings(settings),
    visit: visit
      ? {
          id: visit.id,
          openedAt: visit.openedAt,
          guestNames: visit.guestNames,
          billRequested: Boolean(visit.billRequested),
        }
      : null,
    orders: allOrders,
    calls,
    bill: billOfOrders(allOrders, settings),
    pendingFeedback,
    feedbackGiven,
    recentVisit,
    menuRev: await menuRev(store),
  };
}

// ───────────────────────────── Orders ─────────────────────────────

export async function placeOrder(
  store: Store,
  opts: {
    table: TableDoc;
    guest?: Guest | null;
    inputs: unknown;
    note?: unknown;
    source: "qr" | "waiter";
    waiter?: string;
    guestName?: string;
  },
): Promise<Order> {
  const settings = await getSettings(store);
  if (opts.source === "qr" && !settings.ordering.enabled) {
    throw new ApiError("ORDERING_PAUSED", "Ordering from the table is paused right now. Please ask your waiter.");
  }
  const inputs = Array.isArray(opts.inputs) ? (opts.inputs as OrderLineInput[]) : [];
  if (!inputs.length) throw new ApiError("EMPTY_ORDER", "Your order is empty.");
  if (inputs.length > 60) throw new ApiError("TOO_MANY", "That order is too large. Please split it.");

  const items = new Map((await store.all<MenuItem>(C.items)).map((i) => [i.id, i]));
  const lines = inputs.map((input) => {
    const item = items.get(String(input?.itemId));
    if (!item) throw new ApiError("ITEM_NOT_FOUND", "One of the dishes is no longer on the menu.");
    if (!item.available) throw new ApiError("ITEM_UNAVAILABLE", `${item.name} is not available right now.`);
    return priceLine(item, input);
  });

  const visit = await joinVisit(store, opts.table, opts.guest ?? null);
  const bill = billFor(
    lines.reduce((a, l) => a + l.total, 0),
    settings.ordering,
  );
  const now = Date.now();
  const number = await store.seq("order");
  const guestName = opts.guest?.name ?? opts.guestName?.trim().slice(0, 40) ?? "";
  const order: Order = {
    id: uid(),
    number,
    visitId: visit.id,
    tableId: opts.table.id,
    tableNumber: opts.table.number,
    guestId: opts.guest?.id,
    guestName: guestName || (opts.source === "waiter" ? "Table guest" : "Guest"),
    source: opts.source,
    waiter: opts.waiter,
    lines,
    note: String(opts.note ?? "").trim().slice(0, 200) || undefined,
    status: "received",
    times: { received: now },
    subtotal: bill.subtotal,
    service: bill.service,
    tax: bill.tax,
    total: bill.total,
    createdAt: now,
    updatedAt: now,
  };
  await store.put(C.orders, order);

  if (opts.guest) {
    const fresh = (await store.get<Guest>(C.guests, opts.guest.id)) ?? opts.guest;
    await store.put<Guest>(C.guests, {
      ...fresh,
      orders: fresh.orders + 1,
      spent: fresh.spent + order.total,
      lastSeenAt: now,
      lastTable: opts.table.number,
    });
  }

  const via = opts.source === "qr" ? "from the guest's phone" : `taken by ${opts.waiter ?? "waiter"}`;
  await logEvent(
    store,
    "order",
    `Order #${number} for Table ${opts.table.number} ${via}: ${lines.reduce((a, l) => a + l.qty, 0)} items, ${rs(order.total)}`,
    opts.table.number,
  );
  await pushToStaff(store, ["kitchen"], {
    title: `New order #${number} · Table ${opts.table.number}`,
    body: lines.map((l) => `${l.qty}× ${l.name}`).join(", ").slice(0, 160),
    url: "/kitchen",
    tag: `order-${order.id}`,
  });
  return order;
}

const GUEST_MESSAGE: Partial<Record<OrderStatus, (o: Order) => { title: string; body: string }>> = {
  preparing: (o) => ({
    title: "👨‍🍳 Your order is being prepared",
    body: `Order #${o.number} for Table ${o.tableNumber}: our chefs have started cooking.`,
  }),
  ready: (o) => ({
    title: "✅ Your order is ready",
    body: `Order #${o.number} is ready in the kitchen. Your waiter is collecting it now.`,
  }),
  picked_up: (o) => ({
    title: "🛎️ On its way to your table",
    body: `${o.waiter ? `${o.waiter} is` : "Your waiter is"} bringing order #${o.number} to Table ${o.tableNumber}.`,
  }),
  served: (o) => ({
    title: "🍽️ Enjoy your meal!",
    body: `Order #${o.number} has been served. Need anything else? Tap to call your waiter.`,
  }),
  cancelled: (o) => ({
    title: `Order #${o.number} was cancelled`,
    body: "Please speak to your waiter if this was not expected.",
  }),
};

export async function setOrderStatus(
  store: Store,
  id: unknown,
  status: unknown,
  staff: StaffSession,
): Promise<Order> {
  const order = await store.get<Order>(C.orders, String(id ?? ""));
  if (!order) throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
  const next = String(status) as OrderStatus;
  if (next !== "cancelled" && !ORDER_FLOW.includes(next)) {
    throw new ApiError("BAD_STATUS", "Unknown order status.");
  }
  if (order.status === next) return order;

  const now = Date.now();
  const times = { ...order.times };
  if (next === "cancelled") {
    times.cancelled = now;
  } else {
    const idx = ORDER_FLOW.indexOf(next);
    // Fill in skipped steps and drop anything after the new status.
    ORDER_FLOW.forEach((s, i) => {
      if (i <= idx) times[s] ??= now;
      else delete times[s];
    });
    delete times.cancelled;
  }
  const updated: Order = {
    ...order,
    status: next,
    times,
    updatedAt: now,
    waiter: next === "picked_up" || next === "served" ? (staff.role === "waiter" ? staff.name : order.waiter) : order.waiter,
  };
  await store.put(C.orders, updated);

  if (next === "cancelled" && order.guestId && order.status !== "cancelled") {
    const guest = await store.get<Guest>(C.guests, order.guestId);
    if (guest) {
      await store.put<Guest>(C.guests, {
        ...guest,
        orders: Math.max(0, guest.orders - 1),
        spent: Math.max(0, guest.spent - order.total),
      });
    }
  }

  const label: Record<OrderStatus, string> = {
    received: "moved back to received",
    preparing: "is being prepared",
    ready: "is ready for pickup",
    picked_up: "was picked up",
    served: "was served",
    cancelled: "was cancelled",
  };
  await logEvent(
    store,
    "status",
    `Order #${order.number} (Table ${order.tableNumber}) ${label[next]} · ${staff.name}`,
    order.tableNumber,
  );

  const settings = await getSettings(store);
  const message = GUEST_MESSAGE[next]?.(updated);
  if (message && settings.notifications.orderUpdates) {
    // Everyone at the table who enabled notifications hears about the order.
    const visit = await store.get<Visit>(C.visits, order.visitId);
    const ids = new Set<string | undefined>([order.guestId, ...(visit?.guestIds ?? [])]);
    await pushToGuests(
      store,
      [...ids],
      { ...message, url: "/orders", tag: `order-${order.id}`, kind: "order" },
      { ttl: 900, urgency: "high" },
    );
  }
  if (next === "ready") {
    await pushToStaff(store, ["waiter"], {
      title: `Order #${order.number} ready · Table ${order.tableNumber}`,
      body: "Ready for pickup at the kitchen pass.",
      url: "/waiter",
      tag: `ready-${order.id}`,
    });
  }
  return updated;
}

export async function markKotPrinted(store: Store, id: unknown) {
  const order = await store.get<Order>(C.orders, String(id ?? ""));
  if (!order) throw new ApiError("ORDER_NOT_FOUND", "Order not found.", 404);
  if (!order.kotPrintedAt) await store.put(C.orders, { ...order, kotPrintedAt: Date.now() });
  return true;
}

// ───────────────────────────── Waiter calls ─────────────────────────────

const CALL_TYPES: CallType[] = ["waiter", "bill", "water", "cutlery", "other"];

export async function createCall(
  store: Store,
  opts: {
    table: TableDoc;
    guest?: Guest | null;
    type: unknown;
    note?: unknown;
    origin: WaiterCall["origin"];
    by?: string;
  },
): Promise<WaiterCall> {
  const type = (CALL_TYPES.includes(opts.type as CallType) ? opts.type : "waiter") as CallType;
  const visit = opts.origin === "guest" ? await joinVisit(store, opts.table, opts.guest ?? null) : await currentVisit(store, opts.table);
  const existing = (await store.all<WaiterCall>(C.calls)).find(
    (c) => c.tableId === opts.table.id && c.type === type && c.status === "open" && c.origin === opts.origin,
  );
  if (existing) return existing;

  const call: WaiterCall = {
    id: uid(),
    tableId: opts.table.id,
    tableNumber: opts.table.number,
    visitId: visit?.id,
    guestId: opts.guest?.id,
    guestName: opts.guest?.name ?? opts.by ?? "Guest",
    type,
    note: String(opts.note ?? "").trim().slice(0, 140) || undefined,
    status: "open",
    origin: opts.origin,
    createdAt: Date.now(),
  };
  await store.put(C.calls, call);
  if (type === "bill" && visit && !visit.billRequested) {
    await store.put(C.visits, { ...visit, billRequested: true });
  }
  const who = opts.origin === "guest" ? `Table ${opts.table.number}` : `${opts.by ?? "Staff"} → Table ${opts.table.number}`;
  await logEvent(store, "call", `${who}: ${CALL_SHORT[type]}${call.note ? ` (“${call.note}”)` : ""}`, opts.table.number);
  await pushToStaff(store, ["waiter"], {
    title: `Table ${opts.table.number}: ${CALL_SHORT[type]}`,
    body: call.note ?? (opts.origin === "guest" ? `${call.guestName} is asking for service.` : "Please attend to this table."),
    url: "/waiter",
    tag: `call-${call.id}`,
  });
  return call;
}

export async function updateCall(store: Store, id: unknown, action: unknown, staff: StaffSession) {
  const call = await store.get<WaiterCall>(C.calls, String(id ?? ""));
  if (!call) throw new ApiError("CALL_NOT_FOUND", "This request no longer exists.", 404);
  const now = Date.now();
  if (action === "ack" && call.status === "open") {
    const updated: WaiterCall = { ...call, status: "ack", ackAt: now, ackBy: staff.name };
    await store.put(C.calls, updated);
    await logEvent(store, "call", `${staff.name} is attending Table ${call.tableNumber}`, call.tableNumber);
    if (call.origin === "guest") {
      await pushToGuests(
        store,
        [call.guestId],
        {
          title: `🙋 ${firstName(staff.name)} is on the way`,
          body:
            call.type === "bill"
              ? `Your bill is being brought to Table ${call.tableNumber}.`
              : `Your waiter is coming to Table ${call.tableNumber}.`,
          url: "/orders",
          tag: `call-${call.id}`,
          kind: "call",
        },
        { ttl: 300, urgency: "high" },
      );
    }
    return updated;
  }
  if (action === "done" && call.status !== "done") {
    const updated: WaiterCall = {
      ...call,
      status: "done",
      doneAt: now,
      ackAt: call.ackAt ?? now,
      ackBy: call.ackBy ?? staff.name,
    };
    await store.put(C.calls, updated);
    return updated;
  }
  return call;
}

// ───────────────────────────── Closing a table ─────────────────────────────

export async function closeVisit(store: Store, visitId: unknown, staff: StaffSession) {
  const visit = await store.get<Visit>(C.visits, String(visitId ?? ""));
  if (!visit) throw new ApiError("VISIT_NOT_FOUND", "This table has no open bill.", 404);
  if (visit.status === "closed") return visit;
  const settings = await getSettings(store);
  const orders = (await store.all<Order>(C.orders)).filter((o) => o.visitId === visit.id);
  const now = Date.now();

  // Anything still open is treated as served when the bill is settled.
  const unfinished = orders.filter((o) => ACTIVE.includes(o.status));
  for (const o of unfinished) {
    const times = { ...o.times };
    ORDER_FLOW.forEach((s) => (times[s] ??= now));
    await store.put<Order>(C.orders, { ...o, status: "served", times, updatedAt: now });
  }
  const bill = billOfOrders(orders, settings);
  const closed: Visit = { ...visit, status: "closed", closedAt: now, closedBy: staff.name, total: bill.total };
  await store.put(C.visits, closed);

  const table = await store.get<TableDoc>(C.tables, visit.tableId);
  if (table) await store.put<TableDoc>(C.tables, { ...table, visitSeq: (table.visitSeq ?? 0) + 1 });

  const calls = (await store.all<WaiterCall>(C.calls)).filter((c) => c.tableId === visit.tableId && c.status !== "done");
  if (calls.length) {
    await store.putMany(
      C.calls,
      calls.map((c) => ({ ...c, status: "done" as const, doneAt: now })),
    );
  }
  await logEvent(
    store,
    "visit",
    `Table ${visit.tableNumber} closed by ${staff.name}: bill ${rs(bill.total)}`,
    visit.tableNumber,
  );
  if (settings.notifications.feedbackRequest && visit.guestIds.length) {
    await pushToGuests(
      store,
      visit.guestIds,
      {
        title: "⭐ How was everything at Zaitoon?",
        body: "Thank you for dining with us. It takes 10 seconds to rate your visit.",
        url: "/orders?rate=1",
        tag: `feedback-${visit.id}`,
        kind: "feedback",
      },
      { ttl: 6 * 3600, urgency: "normal" },
    );
  }
  return closed;
}

export async function submitFeedback(
  store: Store,
  guest: Guest,
  input: { visitId?: unknown; food?: unknown; service?: unknown; ambience?: unknown; comment?: unknown },
): Promise<Feedback> {
  const star = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v) || 0)));
  if (!Number(input.food) || !Number(input.service) || !Number(input.ambience)) {
    throw new ApiError("RATING_REQUIRED", "Please rate the food, service and ambience.");
  }
  const visit = input.visitId ? await store.get<Visit>(C.visits, String(input.visitId)) : null;
  const feedback: Feedback = {
    id: visit ? `${visit.id}:${guest.id}` : uid(),
    visitId: visit?.id,
    guestId: guest.id,
    guestName: guest.name,
    tableNumber: visit?.tableNumber ?? guest.lastTable,
    food: star(input.food),
    service: star(input.service),
    ambience: star(input.ambience),
    comment: String(input.comment ?? "").trim().slice(0, 500) || undefined,
    createdAt: Date.now(),
  };
  await store.put(C.feedback, feedback);
  const avg = ((feedback.food + feedback.service + feedback.ambience) / 3).toFixed(1);
  await logEvent(store, "feedback", `${guest.name} rated their visit ${avg} ★`, feedback.tableNumber);
  return feedback;
}

// ───────────────────────────── Staff board ─────────────────────────────

export async function staffBoard(store: Store): Promise<StaffBoard> {
  const now = Date.now();
  const [settings, tables, allOrders, allCalls, allVisits] = await Promise.all([
    getSettings(store),
    store.all<TableDoc>(C.tables),
    store.all<Order>(C.orders),
    store.all<WaiterCall>(C.calls),
    store.all<Visit>(C.visits),
  ]);
  const since = now - 18 * 3_600_000;
  const orders = allOrders
    .filter((o) => !o.sample && (o.createdAt > since || ACTIVE.includes(o.status)))
    .sort((a, b) => a.createdAt - b.createdAt);
  const calls = allCalls.filter((c) => c.status !== "done").sort((a, b) => a.createdAt - b.createdAt);
  const openVisits = new Map(allVisits.filter((v) => v.status === "open").map((v) => [v.id, v]));

  const views: TableView[] = tables
    .sort((a, b) => a.number - b.number)
    .map((t) => {
      const visit = openVisits.get(visitIdFor(t)) ?? null;
      const mine = visit ? orders.filter((o) => o.visitId === visit.id && o.status !== "cancelled") : [];
      const active = mine.filter((o) => ACTIVE.includes(o.status));
      let state: TableState = "free";
      if (visit) state = "seated";
      if (active.some((o) => o.status === "received" || o.status === "preparing")) state = "cooking";
      if (active.some((o) => o.status === "ready" || o.status === "picked_up")) state = "ready";
      if (visit?.billRequested) state = "bill";
      if (calls.some((c) => c.tableId === t.id && c.status === "open")) state = "calling";
      return {
        ...t,
        state,
        visit,
        activeOrders: active.length,
        openTotal: mine.reduce((a, o) => a + o.total, 0),
      };
    });

  return {
    now,
    orders,
    tables: views,
    calls,
    settings: staffSettings(settings),
    menuRev: await menuRev(store),
    durable: store.durable,
  };
}

// ───────────────────────────── Admin overview ─────────────────────────────

export async function adminOverview(store: Store): Promise<AdminOverview> {
  const now = Date.now();
  const [tables, orders, calls, visits, guests, subs, feedback, events] = await Promise.all([
    store.all<TableDoc>(C.tables),
    store.all<Order>(C.orders),
    store.all<WaiterCall>(C.calls),
    store.all<Visit>(C.visits),
    store.all<Guest>(C.guests),
    store.all<PushSub>(C.subs),
    store.all<Feedback>(C.feedback),
    store.all<ActivityEvent>(C.events),
  ]);

  const valid = orders.filter((o) => o.status !== "cancelled");
  const today0 = startOfDay(now);
  const today = valid.filter((o) => o.createdAt >= today0);
  const revenue = today.reduce((a, o) => a + o.total, 0);
  const prepTimes = today
    .filter((o) => o.times.ready && o.times.received)
    .map((o) => (o.times.ready! - o.times.received!) / MIN);

  const series: AdminOverview["series"] = [];
  for (let d = 6; d >= 0; d--) {
    const start = today0 - d * DAY_MS;
    const dayOrders = valid.filter((o) => o.createdAt >= start && o.createdAt < start + DAY_MS);
    series.push({
      day: dateKey(start),
      label: d === 0 ? "Today" : weekdayLabel(start),
      revenue: dayOrders.reduce((a, o) => a + o.total, 0),
      orders: dayOrders.length,
    });
  }

  const week = valid.filter((o) => o.createdAt >= today0 - 6 * DAY_MS);
  const hourCounts = new Map<number, number>();
  for (const o of week) hourCounts.set(hourOf(o.createdAt), (hourCounts.get(hourOf(o.createdAt)) ?? 0) + 1);
  const hours: AdminOverview["hours"] = [];
  for (let h = 11; h <= 23; h++) hours.push({ hour: h, orders: hourCounts.get(h) ?? 0 });

  const itemTotals = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of week) {
    for (const l of o.lines) {
      const cur = itemTotals.get(l.itemId) ?? { name: l.name, qty: 0, revenue: 0 };
      cur.qty += l.qty;
      cur.revenue += l.total;
      itemTotals.set(l.itemId, cur);
    }
  }
  const topItems = [...itemTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

  const pushGuests = new Set(subs.map((s) => s.guestId).filter(Boolean));
  const ratings = feedback.map((f) => (f.food + f.service + f.ambience) / 3);

  void shortDate;
  return {
    today: {
      revenue,
      orders: today.length,
      avgTicket: today.length ? Math.round(revenue / today.length) : 0,
      avgPrepMin: prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : null,
      activeTables: visits.filter((v) => v.status === "open").length,
      totalTables: tables.filter((t) => t.active).length,
      openCalls: calls.filter((c) => c.status === "open").length,
      inKitchen: orders.filter((o) => o.status === "received" || o.status === "preparing").length,
    },
    guests: {
      total: guests.length,
      // Sample guests are shown as reachable so the dashboard reads like a live venue.
      push: guests.filter((g) => (g.sample ? g.pushEnabled : pushGuests.has(g.id))).length,
      returning: guests.filter((g) => g.visits > 1).length,
    },
    rating: {
      avg: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      count: ratings.length,
    },
    series,
    hours,
    topItems,
    sources: {
      qr: week.filter((o) => o.source === "qr").length,
      waiter: week.filter((o) => o.source === "waiter").length,
    },
    events: events.sort((a, b) => b.ts - a.ts).slice(0, 40),
    durable: store.durable,
    storage: store.label,
  };
}

/** Keeps the activity feed from growing without bound. */
export async function pruneEvents(store: Store) {
  const events = await store.all<ActivityEvent>(C.events);
  if (events.length <= 400) return;
  const old = events.sort((a, b) => a.ts - b.ts).slice(0, events.length - 250);
  await store.delMany(
    C.events,
    old.map((e) => e.id),
  );
}
