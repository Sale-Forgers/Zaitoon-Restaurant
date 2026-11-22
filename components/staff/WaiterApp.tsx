"use client";

import {
  Armchair,
  BellRing,
  Check,
  ChefHat,
  ConciergeBell,
  Flame,
  HandPlatter,
  Plus,
  Printer,
  ReceiptText,
  UsersRound,
  Utensils,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Splash } from "@/components/brand";
import { usePrint } from "@/components/print/PrintHost";
import { BillTicket, billOf } from "@/components/print/Ticket";
import { Badge, Button, Empty, Segmented, Sheet, useToast } from "@/components/ui";
import { useNow } from "@/lib/client/live";
import { enablePush, getPushState, type PushState } from "@/lib/client/push";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { chime, unlockSound } from "@/lib/client/sound";
import { ago, CALL_SHORT, clock, cn, rs, STATUS_LABEL, TABLE_STATE_LABEL } from "@/lib/format";
import { lineOptions } from "@/lib/pricing";
import type { Order, OrderStatus, StaffBoard, TableState, TableView, WaiterCall } from "@/lib/types";
import { OrderPad } from "./OrderPad";
import { StaffBar, useStaff } from "./StaffGate";
import { useBoard, useDevicePref, useOrderActions, useStaffMenu } from "./useBoard";

const TILE: Record<TableState, { box: string; sub: string; icon: ReactNode }> = {
  free: { box: "border-ink-900/8 bg-white text-ink-700", sub: "text-ink-300", icon: <Armchair className="size-4" /> },
  seated: { box: "border-olive-400/60 bg-olive-50 text-olive-800", sub: "text-olive-600", icon: <UsersRound className="size-4" /> },
  cooking: { box: "border-gold-400 bg-gold-50 text-gold-800", sub: "text-gold-700", icon: <Flame className="size-4" /> },
  ready: { box: "border-leaf-500 bg-leaf-500 text-white", sub: "text-white/85", icon: <HandPlatter className="size-4" /> },
  calling: { box: "border-ruby-500 bg-ruby-500 text-white", sub: "text-white/85", icon: <BellRing className="size-4" /> },
  bill: { box: "border-ink-900 bg-ink-900 text-gold-200", sub: "text-gold-300/80", icon: <ReceiptText className="size-4" /> },
};

const STATUS_TONE: Record<OrderStatus, "sky" | "gold" | "leaf" | "olive" | "neutral" | "ruby"> = {
  received: "sky",
  preparing: "gold",
  ready: "leaf",
  picked_up: "olive",
  served: "neutral",
  cancelled: "ruby",
};

export function WaiterApp() {
  const board = useBoard();
  const { session } = useStaff();
  const toast = useToast();
  const [sound, setSound] = useDevicePref("zr.waiter.sound", true);
  const [tab, setTab] = useState<"floor" | "alerts">("floor");
  const [tableId, setTableId] = useState<string | null>(null);
  const [padFor, setPadFor] = useState<string | null>(null);
  const [push, setPush] = useState<PushState | null>(null);
  const menu = useStaffMenu(board.data?.menuRev);
  const known = useRef<{ calls: Set<string>; ready: Set<string> } | null>(null);

  useEffect(() => {
    getPushState().then(setPush);
  }, []);

  const data = board.data;
  const openCalls = useMemo(() => (data?.calls ?? []).filter((c) => c.status !== "done"), [data]);
  const ready = useMemo(() => (data?.orders ?? []).filter((o) => o.status === "ready"), [data]);
  const carrying = useMemo(() => (data?.orders ?? []).filter((o) => o.status === "picked_up"), [data]);

  // Chime when a guest calls or food reaches the pass.
  useEffect(() => {
    if (!data) return;
    const calls = new Set(openCalls.filter((c) => c.status === "open").map((c) => c.id));
    const readyIds = new Set(ready.map((o) => o.id));
    if (known.current && sound) {
      if ([...calls].some((id) => !known.current!.calls.has(id))) chime("call");
      else if ([...readyIds].some((id) => !known.current!.ready.has(id))) chime("ready");
    }
    known.current = { calls, ready: readyIds };
  }, [data, openCalls, ready, sound]);

  if (!data) return <Splash label="Loading the floor…" />;

  const table = tableId ? (data.tables.find((t) => t.id === tableId) ?? null) : null;
  const padTable = padFor ? (data.tables.find((t) => t.id === padFor) ?? null) : null;
  const alertCount = openCalls.filter((c) => c.status === "open").length + ready.length;
  const zones = [...new Set(data.tables.filter((t) => t.active).map((t) => t.zone))];

  const enableAlerts = async () => {
    try {
      const next = await enablePush({ staff: true });
      setPush(next);
      toast(
        next === "enabled"
          ? { title: "Alerts are on for this device", text: "You will be notified of calls and ready orders even with the screen off." }
          : { title: "Alerts could not be turned on", text: "Allow notifications for this site in the browser settings.", tone: "error" },
      );
    } catch (e) {
      toast({ title: "Alerts could not be turned on", text: errorMessage(e), tone: "error" });
    }
  };

  const alerts = (
    <AlertsPanel
      calls={openCalls}
      ready={ready}
      carrying={carrying}
      me={session.name}
      onOpenTable={(id) => setTableId(id)}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100" onPointerDown={unlockSound}>
      <StaffBar title="Waiter App" subtitle={`Signed in as ${session.name}`}>
        {push && push !== "enabled" && push !== "unsupported" && push !== "insecure" && (
          <button
            onClick={enableAlerts}
            className="hidden h-10 items-center gap-2 rounded-full bg-gold-400/15 px-3 text-xs font-semibold text-gold-300 ring-1 ring-gold-400/40 sm:flex"
          >
            <BellRing className="size-4" /> Turn on alerts
          </button>
        )}
        <button
          onClick={() => setSound(!sound)}
          aria-label={sound ? "Sound on" : "Sound off"}
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition",
            sound ? "bg-gold-400/15 text-gold-300 ring-1 ring-gold-400/40" : "bg-white/6 text-sand-300",
          )}
        >
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      </StaffBar>

      <div className="border-b border-ink-900/6 bg-cream-50 px-4 py-3 lg:hidden">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={tab}
          onChange={setTab}
          options={[
            { value: "floor", label: "Tables" },
            {
              value: "alerts",
              label: (
                <span className="flex items-center justify-center gap-1.5">
                  Alerts
                  {alertCount > 0 && (
                    <span className="tabular rounded-full bg-ruby-500 px-1.5 text-[11px] text-white">{alertCount}</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className={cn("p-4 sm:p-6", tab === "floor" ? "block" : "hidden lg:block")}>
          <Legend />
          {zones.map((zone) => (
            <section key={zone} className="mt-5">
              <h2 className="font-display mb-3 text-xl font-semibold">{zone}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {data.tables
                  .filter((t) => t.active && t.zone === zone)
                  .map((t) => (
                    <TableTile key={t.id} table={t} onClick={() => setTableId(t.id)} />
                  ))}
              </div>
            </section>
          ))}
        </main>

        <aside
          className={cn(
            "border-ink-900/8 bg-cream-50 lg:block lg:border-l",
            tab === "alerts" ? "block" : "hidden",
          )}
        >
          <div className="p-4 sm:p-5 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">{alerts}</div>
        </aside>
      </div>

      <Sheet
        open={Boolean(table) && !padTable}
        onClose={() => setTableId(null)}
        size="lg"
        title={
          table && (
            <span className="flex flex-wrap items-center gap-2.5">
              Table {table.number}
              <Badge tone={table.state === "free" ? "neutral" : table.state === "calling" ? "ruby" : "gold"}>
                {TABLE_STATE_LABEL[table.state]}
              </Badge>
            </span>
          )
        }
      >
        {table && (
          <TableDetail
            table={table}
            board={data}
            onTakeOrder={() => setPadFor(table.id)}
            onClosed={() => setTableId(null)}
          />
        )}
      </Sheet>

      {padTable && menu && <OrderPad table={padTable} menu={menu} onClose={() => setPadFor(null)} />}
    </div>
  );
}

function Legend() {
  const items: [TableState, string][] = [
    ["free", "Free"],
    ["seated", "Seated"],
    ["cooking", "In kitchen"],
    ["ready", "Ready to serve"],
    ["calling", "Calling"],
    ["bill", "Bill"],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-ink-500">
      {items.map(([state, label]) => (
        <span key={state} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-[5px] border", TILE[state].box)} />
          {label}
        </span>
      ))}
    </div>
  );
}

function TableTile({ table, onClick }: { table: TableView; onClick: () => void }) {
  const style = TILE[table.state];
  const urgent = table.state === "calling" || table.state === "ready";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex min-h-[124px] flex-col rounded-3xl border-2 p-3.5 text-left shadow-soft transition active:scale-[0.97]",
        style.box,
        urgent && "animate-ring",
      )}
      style={
        urgent
          ? ({
              "--ring-color": table.state === "calling" ? "rgb(197 53 43 / 0.5)" : "rgb(47 154 73 / 0.5)",
            } as React.CSSProperties)
          : undefined
      }
    >
      <span className="flex items-start justify-between">
        <span className="font-display text-[34px] leading-none font-semibold">{table.number}</span>
        <span className={cn("flex items-center gap-1 text-xs font-semibold", style.sub)}>
          <UsersRound className="size-3.5" />
          {table.seats}
        </span>
      </span>
      <span className="mt-auto">
        <span className="flex items-center gap-1.5 text-[13px] font-bold">
          {style.icon}
          {TABLE_STATE_LABEL[table.state]}
        </span>
        <span className={cn("mt-0.5 block truncate text-xs", style.sub)}>
          {table.visit
            ? table.openTotal
              ? `${rs(table.openTotal)}${table.visit.guestNames[0] ? ` · ${table.visit.guestNames[0].split(" ")[0]}` : ""}`
              : (table.visit.guestNames[0] ?? "Guests seated")
            : "Tap to seat or order"}
        </span>
      </span>
    </button>
  );
}

// ───────────────────────────── Alerts ─────────────────────────────

function AlertsPanel({
  calls,
  ready,
  carrying,
  me,
  onOpenTable,
}: {
  calls: WaiterCall[];
  ready: Order[];
  carrying: Order[];
  me: string;
  onOpenTable: (tableId: string) => void;
}) {
  const now = useNow();
  const toast = useToast();
  const { busy, setStatus } = useOrderActions();
  const [callBusy, setCallBusy] = useState<string | null>(null);

  const act = async (call: WaiterCall, action: "ack" | "done") => {
    setCallBusy(call.id);
    try {
      await rpc("staff.call.update", { id: call.id, action });
    } catch (e) {
      toast({ title: "Could not update the request", text: errorMessage(e), tone: "error" });
    } finally {
      setCallBusy(null);
    }
  };

  const empty = calls.length + ready.length + carrying.length === 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Needs attention</h2>
        {!empty && <Badge tone="ruby">{calls.filter((c) => c.status === "open").length + ready.length} new</Badge>}
      </div>

      {empty && (
        <div className="rounded-3xl border border-dashed border-ink-900/12">
          <Empty icon={<Check className="size-6" />} title="All tables are happy" text="Guest calls and ready orders will appear here." />
        </div>
      )}

      <div className="space-y-3">
        {calls.map((call) => {
          const open = call.status === "open";
          return (
            <article
              key={call.id}
              className={cn(
                "animate-rise rounded-3xl border p-4 shadow-soft",
                open ? "border-ruby-500/30 bg-ruby-50" : "border-ink-900/8 bg-white",
              )}
            >
              <button onClick={() => onOpenTable(call.tableId)} className="flex w-full items-center gap-3 text-left">
                <span
                  className={cn(
                    "font-display flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold",
                    open ? "bg-ruby-500 text-white" : "bg-ink-900/6 text-ink-700",
                  )}
                >
                  {call.tableNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[15px] font-bold">
                    {call.type === "bill" ? <ReceiptText className="size-4" /> : <ConciergeBell className="size-4" />}
                    {CALL_SHORT[call.type]}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {call.origin === "guest" ? call.guestName : `From ${call.guestName}`}
                    {now ? ` · ${ago(call.createdAt, now)}` : ""}
                    {call.ackBy ? ` · ${call.ackBy} attending` : ""}
                  </span>
                </span>
              </button>
              {call.note && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-ink-600">“{call.note}”</p>}
              <div className="mt-3 flex gap-2">
                {open && (
                  <Button size="sm" variant="danger" block loading={callBusy === call.id} onClick={() => act(call, "ack")}>
                    On my way
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={open ? "outline" : "ink"}
                  block
                  disabled={callBusy === call.id}
                  icon={<Check className="size-4" />}
                  onClick={() => act(call, "done")}
                >
                  Done
                </Button>
              </div>
            </article>
          );
        })}

        {ready.map((o) => (
          <ServeCard
            key={o.id}
            order={o}
            tone="leaf"
            title="Ready at the pass"
            action="Pick up"
            busy={busy === o.id}
            onAction={() => setStatus(o.id, "picked_up")}
            onOpen={() => onOpenTable(o.tableId)}
          />
        ))}
        {carrying.map((o) => (
          <ServeCard
            key={o.id}
            order={o}
            tone="gold"
            title={o.waiter && o.waiter !== me ? `With ${o.waiter}` : "On its way"}
            action="Mark served"
            busy={busy === o.id}
            onAction={() => setStatus(o.id, "served")}
            onOpen={() => onOpenTable(o.tableId)}
          />
        ))}
      </div>
    </div>
  );
}

function ServeCard({
  order,
  tone,
  title,
  action,
  busy,
  onAction,
  onOpen,
}: {
  order: Order;
  tone: "leaf" | "gold";
  title: string;
  action: string;
  busy: boolean;
  onAction: () => void;
  onOpen: () => void;
}) {
  const leaf = tone === "leaf";
  return (
    <article
      className={cn(
        "animate-rise rounded-3xl border p-4 shadow-soft",
        leaf ? "border-leaf-500/30 bg-leaf-50" : "border-gold-400/40 bg-gold-50",
      )}
    >
      <button onClick={onOpen} className="flex w-full items-center gap-3 text-left">
        <span
          className={cn(
            "font-display flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold",
            leaf ? "bg-leaf-500 text-white" : "bg-gold-sheen text-ink-900",
          )}
        >
          {order.tableNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-bold">
            <HandPlatter className="size-4" />
            {title} · #{order.number}
          </span>
          <span className="block truncate text-xs text-ink-500">{order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</span>
        </span>
      </button>
      <Button size="sm" variant={leaf ? "leaf" : "ink"} block className="mt-3" loading={busy} onClick={onAction}>
        {action}
      </Button>
    </article>
  );
}

// ───────────────────────────── Table detail ─────────────────────────────

function TableDetail({
  table,
  board,
  onTakeOrder,
  onClosed,
}: {
  table: TableView;
  board: StaffBoard;
  onTakeOrder: () => void;
  onClosed: () => void;
}) {
  const toast = useToast();
  const print = usePrint();
  const { session } = useStaff();
  const { busy, setStatus } = useOrderActions();
  const [closing, setClosing] = useState(false);
  const [seating, setSeating] = useState(false);

  const orders = table.visit ? board.orders.filter((o) => o.visitId === table.visit!.id).sort((a, b) => b.createdAt - a.createdAt) : [];
  const calls = board.calls.filter((c) => c.tableId === table.id);
  const bill = billOf(orders, board.settings.ordering);

  const seat = async () => {
    setSeating(true);
    try {
      await rpc("staff.visit.open", { tableId: table.id });
    } catch (e) {
      toast({ title: "Could not seat the table", text: errorMessage(e), tone: "error" });
    } finally {
      setSeating(false);
    }
  };

  const printBill = () =>
    print(
      <BillTicket
        tableNumber={table.number}
        orders={[...orders].reverse()}
        bill={bill}
        restaurant={board.settings.restaurant}
        waiter={session.name}
        at={Date.now()}
      />,
    );

  const close = async () => {
    if (!table.visit) return;
    if (!window.confirm(`Close Table ${table.number} and settle ${rs(bill.total)}?`)) return;
    setClosing(true);
    try {
      await rpc("staff.visit.close", { visitId: table.visit.id });
      toast({
        title: `Table ${table.number} closed`,
        text: table.visit.guestIds.length ? "The guests were invited to rate their visit." : undefined,
      });
      onClosed();
    } catch (e) {
      toast({ title: "Could not close the table", text: errorMessage(e), tone: "error" });
    } finally {
      setClosing(false);
    }
  };

  const nextFor = (o: Order): { status: OrderStatus; label: string } | null =>
    o.status === "ready"
      ? { status: "picked_up", label: "Pick up" }
      : o.status === "picked_up"
        ? { status: "served", label: "Mark served" }
        : null;

  return (
    <div>
      <p className="-mt-1 text-sm text-ink-400">
        {table.zone} · {table.seats} seats
        {table.visit ? ` · seated ${clock(table.visit.openedAt)}` : ""}
        {table.visit?.guestNames.length ? ` · ${table.visit.guestNames.join(", ")}` : ""}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="gold" icon={<Plus className="size-4" />} onClick={onTakeOrder} className="col-span-2 sm:col-span-1">
          Take order
        </Button>
        {!table.visit ? (
          <Button variant="outline" icon={<Armchair className="size-4" />} loading={seating} onClick={seat}>
            Seat guests
          </Button>
        ) : (
          <>
            <Button variant="outline" icon={<Printer className="size-4" />} disabled={!orders.length} onClick={printBill}>
              Print bill
            </Button>
            <Button variant="ink" icon={<Check className="size-4" />} loading={closing} onClick={close}>
              Close table
            </Button>
          </>
        )}
      </div>

      {calls.length > 0 && (
        <div className="mt-4 space-y-2">
          {calls.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-ruby-50 px-4 py-3 text-ruby-700">
              <ConciergeBell className="size-5 shrink-0" />
              <p className="min-w-0 flex-1 text-sm font-semibold">
                {CALL_SHORT[c.type]}
                {c.note ? `: “${c.note}”` : ""}
                {c.status === "ack" ? ` · ${c.ackBy} attending` : ""}
              </p>
              <button
                onClick={() => rpc("staff.call.update", { id: c.id, action: c.status === "open" ? "ack" : "done" }).catch(() => {})}
                className="shrink-0 rounded-full bg-ruby-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                {c.status === "open" ? "On my way" : "Done"}
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-6 mb-2 text-[13px] font-semibold tracking-wide text-ink-400 uppercase">Orders on this table</h3>
      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-900/12">
          <Empty
            icon={<Utensils className="size-6" />}
            title={table.visit ? "No orders yet" : "Table is free"}
            text={table.visit ? "Take the order here, or let the guests order from their phone." : "Seat guests or take an order to open the table."}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const next = nextFor(o);
            return (
              <article key={o.id} className="rounded-3xl border border-ink-900/6 bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-semibold">#{o.number}</span>
                  <Badge tone={STATUS_TONE[o.status]} dot>
                    {STATUS_LABEL[o.status]}
                  </Badge>
                  <span className="ml-auto text-xs text-ink-400">
                    {clock(o.createdAt)} · {o.source === "qr" ? `QR · ${o.guestName}` : `Waiter · ${o.waiter}`}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {o.lines.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="tabular w-6 shrink-0 font-bold text-gold-700">{l.qty}×</span>
                      <span className="min-w-0 flex-1">
                        {l.name}
                        {lineOptions(l) && <span className="text-ink-400"> · {lineOptions(l)}</span>}
                        {l.note && <span className="text-ember-600"> · “{l.note}”</span>}
                      </span>
                      <span className="tabular text-ink-500">{rs(l.total)}</span>
                    </li>
                  ))}
                </ul>
                {o.note && <p className="mt-2 rounded-xl bg-cream-200 px-3 py-1.5 text-[13px] text-ink-500">Note: {o.note}</p>}
                {(next || o.status === "received") && (
                  <div className="mt-3 flex gap-2">
                    {next && (
                      <Button size="sm" variant="leaf" loading={busy === o.id} onClick={() => setStatus(o.id, next.status)}>
                        {next.label}
                      </Button>
                    )}
                    {o.status === "received" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.confirm(`Cancel order #${o.number}?`) && setStatus(o.id, "cancelled")}
                      >
                        Cancel order
                      </Button>
                    )}
                  </div>
                )}
                {(o.status === "received" || o.status === "preparing") && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
                    <ChefHat className="size-3.5" /> In the kitchen
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <dl className="mt-4 space-y-1.5 rounded-3xl bg-cream-200/70 p-4 text-sm">
          {(bill.service > 0 || bill.tax > 0) && (
            <div className="flex justify-between text-ink-500">
              <dt>Subtotal</dt>
              <dd className="tabular">{rs(bill.subtotal)}</dd>
            </div>
          )}
          {bill.service > 0 && (
            <div className="flex justify-between text-ink-500">
              <dt>Service charge ({bill.servicePct}%)</dt>
              <dd className="tabular">{rs(bill.service)}</dd>
            </div>
          )}
          {bill.tax > 0 && (
            <div className="flex justify-between text-ink-500">
              <dt>
                {bill.taxLabel} ({bill.taxPct}%)
              </dt>
              <dd className="tabular">{rs(bill.tax)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <dt className="font-semibold">Bill total</dt>
            <dd className="font-display tabular text-2xl font-semibold">{rs(bill.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
