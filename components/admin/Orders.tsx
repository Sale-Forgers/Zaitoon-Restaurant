"use client";

import { Ban, Check, ChevronRight, ClipboardList, ConciergeBell, Printer, QrCode, StickyNote } from "lucide-react";
import { useCallback, useState } from "react";
import { usePrint } from "@/components/print/PrintHost";
import { KotTicket } from "@/components/print/Ticket";
import { Badge, Button, Card, Empty, Sheet } from "@/components/ui";
import { useLive, useSlowNow } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { clock, cn, dateTime, dayLabel, rs, STATUS_LABEL } from "@/lib/format";
import { lineOptions } from "@/lib/pricing";
import { DAY_MS, startOfDay } from "@/lib/time";
import { ORDER_FLOW, type Order, type OrderStatus } from "@/lib/types";
import { useBoard } from "./AdminShell";
import { LoadError, PageHeader, SampleTag, SearchBox, SkeletonList, StatusBadge, useAction, useConfirm } from "./parts";

const ACTIVE: OrderStatus[] = ["received", "preparing", "ready", "picked_up"];

type Tab = "active" | "today" | "week" | "all";
const TABS: { value: Tab; label: string; days: number }[] = [
  { value: "active", label: "Active", days: 0 },
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "Last 7 days", days: 7 },
  { value: "all", label: "All 14 days", days: 14 },
];

const COLUMNS = "grid-cols-[72px_88px_minmax(130px,1fr)_minmax(180px,2fr)_104px_124px_96px_20px]";

export function OrdersPage() {
  const board = useBoard();
  const now = useSlowNow();
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);

  const days = TABS.find((t) => t.value === tab)!.days;
  const history = useLive(() => rpc("admin.orders", { days: days || 1 }), `orders:${days}`, tab !== "active");

  const live = board.data?.orders ?? [];
  const activeCount = live.filter((o) => ACTIVE.includes(o.status)).length;

  let rows: Order[];
  if (tab === "active") {
    rows = live.filter((o) => ACTIVE.includes(o.status)).sort((a, b) => a.createdAt - b.createdAt);
  } else {
    // History may still hold the previous range for a moment: filter by the range shown.
    const since = !now ? 0 : tab === "today" ? startOfDay(now) : tab === "week" ? now - 7 * DAY_MS : 0;
    rows = (history.data ?? []).filter((o) => o.createdAt >= since).sort((a, b) => b.createdAt - a.createdAt);
  }

  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (q) {
    rows = rows.filter(
      (o) =>
        String(o.number).includes(q) ||
        `table ${o.tableNumber}`.includes(q) ||
        o.guestName.toLowerCase().includes(q) ||
        (o.waiter ?? "").toLowerCase().includes(q) ||
        o.lines.some((l) => l.name.toLowerCase().includes(q)),
    );
  }

  const counted = rows.filter((o) => o.status !== "cancelled");
  const revenue = counted.reduce((a, o) => a + o.total, 0);
  const loading = tab === "active" ? !board.data : !history.data;
  const error = tab === "active" ? board.error : history.error;
  const open = openId ? ([...live, ...(history.data ?? [])].find((o) => o.id === openId) ?? null) : null;
  const target = board.data?.settings.kitchen.targetMinutes ?? 20;

  return (
    <>
      <PageHeader
        title="Live orders"
        subtitle="Every order from guests' phones and waiter tablets, from the moment it is placed until it is served."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex rounded-full bg-ink-900/6 p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition",
                  tab === t.value ? "bg-ink-900 text-cream-50 shadow-soft" : "text-ink-500 hover:text-ink-900",
                )}
              >
                {t.label}
                {t.value === "active" && activeCount > 0 && (
                  <span
                    className={cn(
                      "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                      tab === "active" ? "bg-gold-sheen text-ink-900" : "bg-ink-900 text-cream-50",
                    )}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search table, order number, guest or dish" className="min-w-56 flex-1 sm:max-w-sm" />
        <div className="tabular ml-auto flex items-center gap-5 text-sm text-ink-500">
          <span>
            <b className="text-ink-900">{rows.length}</b> {rows.length === 1 ? "order" : "orders"}
          </span>
          <span>
            <b className="text-ink-900">{rs(revenue)}</b> total
          </span>
          {counted.length > 0 && (
            <span className="hidden sm:inline">
              <b className="text-ink-900">{rs(revenue / counted.length)}</b> average
            </span>
          )}
        </div>
      </div>

      {loading ? (
        error ? (
          <LoadError error={error} retry={tab === "active" ? board.refresh : history.refresh} />
        ) : (
          <SkeletonList rows={7} />
        )
      ) : rows.length === 0 ? (
        <Card>
          <Empty
            icon={<ClipboardList className="size-6" />}
            title={q ? "No orders match your search" : tab === "active" ? "No orders in progress" : "No orders in this period"}
            text={
              q
                ? "Try a table number, an order number or a guest's name."
                : tab === "active"
                  ? "New orders appear here the moment a guest or a waiter sends them to the kitchen."
                  : "Orders will be listed here once they are placed."
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className={cn("grid items-center gap-4 border-b border-ink-900/8 bg-cream-50 px-6 py-3 text-[11px] font-semibold tracking-wider text-ink-400 uppercase", COLUMNS)}>
              <span>Order</span>
              <span>Table</span>
              <span>Guest</span>
              <span>Items</span>
              <span className="text-right">Total</span>
              <span>Status</span>
              <span className="text-right">Placed</span>
              <span />
            </div>
            <ul className="divide-y divide-ink-900/6">
              {rows.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => setOpenId(o.id)}
                    className={cn("grid w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-cream-100", COLUMNS)}
                  >
                    <span className="min-w-0">
                      <span className="font-display tabular block text-lg leading-tight font-semibold">#{o.number}</span>
                      {o.sample && <SampleTag />}
                    </span>
                    <span className="tabular text-sm font-semibold text-ink-700">Table {o.tableNumber}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink-900">{o.guestName}</span>
                      <Source order={o} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink-700">{summary(o)}</span>
                      <span className="text-xs text-ink-400">{itemCount(o)} items</span>
                    </span>
                    <span className={cn("tabular text-right text-sm font-semibold", o.status === "cancelled" && "text-ink-300 line-through")}>
                      {rs(o.total)}
                    </span>
                    <span>
                      <StatusBadge status={o.status} />
                    </span>
                    <Placed order={o} now={now} target={target} />
                    <ChevronRight className="size-4 text-ink-300" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Phone cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpenId(o.id)} className="w-full text-left">
                  <Card className="p-4 transition active:bg-cream-100">
                    <div className="flex items-center gap-3">
                      <span className="font-display tabular text-xl leading-none font-semibold">#{o.number}</span>
                      <span className="tabular rounded-full bg-ink-900/6 px-2.5 py-1 text-xs font-semibold text-ink-700">Table {o.tableNumber}</span>
                      {o.sample && <SampleTag />}
                      <StatusBadge status={o.status} className="ml-auto" />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-ink-700">{summary(o)}</p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.guestName}</p>
                        <Source order={o} />
                      </div>
                      <div className="text-right">
                        <p className={cn("tabular text-sm font-semibold", o.status === "cancelled" && "text-ink-300 line-through")}>{rs(o.total)}</p>
                        <p className="tabular text-xs text-ink-400">
                          {dayLabel(o.createdAt)}, {clock(o.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <OrderSheet order={open} onClose={close} now={now} />
    </>
  );
}

const itemCount = (o: Order) => o.lines.reduce((a, l) => a + l.qty, 0);
const summary = (o: Order) => o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ");

function Source({ order }: { order: Order }) {
  const qr = order.source === "qr";
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-400">
      {qr ? <QrCode className="size-3" /> : <ConciergeBell className="size-3" />}
      {qr ? "Guest's phone" : `Waiter${order.waiter ? ` · ${order.waiter}` : ""}`}
    </span>
  );
}

function Placed({ order, now, target }: { order: Order; now: number; target: number }) {
  const waiting = order.status === "received" || order.status === "preparing";
  const minutes = now ? Math.max(0, Math.floor((now - order.createdAt) / 60_000)) : 0;
  const today = now ? order.createdAt >= startOfDay(now) : true;
  return (
    <span className="tabular text-right">
      <span className="block text-sm text-ink-700">{clock(order.createdAt)}</span>
      {waiting && now ? (
        <span className={cn("text-xs font-semibold", minutes >= target ? "text-ruby-500" : "text-ink-400")}>{minutes} min</span>
      ) : (
        <span className="text-xs text-ink-400">{today ? "Today" : dayLabel(order.createdAt)}</span>
      )}
    </span>
  );
}

function OrderSheet({ order, onClose, now }: { order: Order | null; onClose: () => void; now: number }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const print = usePrint();
  if (!order) return null;

  const move = (status: OrderStatus) =>
    run(
      status,
      () => rpc("staff.order.status", { id: order.id, status }),
      () => `Order #${order.number} is now ${STATUS_LABEL[status].toLowerCase()}`,
    );

  const cancel = async () => {
    const ok = await confirm({
      title: `Cancel order #${order.number}?`,
      text: `Table ${order.tableNumber} · ${rs(order.total)}. The kitchen stops preparing it and the guest is told on their phone.`,
      confirmLabel: "Cancel the order",
      danger: true,
    });
    if (ok) await move("cancelled");
  };

  const current = ORDER_FLOW.indexOf(order.status);
  const stamps = ORDER_FLOW.filter((s) => order.times[s]).map((s) => ({ status: s, at: order.times[s]! }));
  if (order.times.cancelled) stamps.push({ status: "cancelled", at: order.times.cancelled });

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-3">
          Order #{order.number}
          <StatusBadge status={order.status} />
          {order.sample && <SampleTag />}
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2.5 pb-1">
          <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => print(<KotTicket order={order} />)}>
            Print kitchen ticket
          </Button>
          {!order.sample && order.status !== "cancelled" && order.status !== "served" && (
            <Button variant="ghost" className="text-ruby-600 hover:bg-ruby-50" icon={<Ban className="size-4" />} loading={busy === "cancelled"} onClick={cancel}>
              Cancel order
            </Button>
          )}
          <Button variant="ink" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Table" value={`Table ${order.tableNumber}`} />
        <Fact label="Guest" value={order.guestName} />
        <Fact label="Ordered by" value={order.source === "qr" ? "Guest's phone" : `Waiter ${order.waiter ?? ""}`.trim()} />
        <Fact label="Placed" value={now && order.createdAt >= startOfDay(now) ? clock(order.createdAt) : dateTime(order.createdAt)} />
      </div>

      {!order.sample && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Move this order to</p>
          <div className="flex flex-wrap gap-2">
            {ORDER_FLOW.map((s, i) => {
              const isCurrent = order.status === s;
              const done = current > i;
              return (
                <button
                  key={s}
                  disabled={isCurrent || busy !== null}
                  onClick={() => move(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition disabled:cursor-default",
                    isCurrent
                      ? "border-ink-900 bg-ink-900 text-cream-50"
                      : done
                        ? "border-leaf-500/30 bg-leaf-50 text-leaf-700 hover:border-leaf-500"
                        : "border-ink-900/12 bg-white text-ink-700 hover:border-ink-900/40",
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-400">The guest gets a notification on their phone at every step.</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-900/8 bg-white">
        <ul className="divide-y divide-ink-900/6">
          {order.lines.map((l, i) => (
            <li key={i} className="flex gap-3 px-4 py-3">
              <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-cream-50">{l.qty}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{l.name}</p>
                {lineOptions(l) && <p className="mt-0.5 text-xs text-ink-400">{lineOptions(l)}</p>}
                {l.note && <p className="mt-1 text-xs font-medium text-ember-600">Note: {l.note}</p>}
              </div>
              <span className="tabular text-sm font-semibold text-ink-700">{rs(l.total)}</span>
            </li>
          ))}
        </ul>
        <div className="tabular space-y-1.5 border-t border-ink-900/8 bg-cream-50 px-4 py-3 text-sm">
          {(order.service > 0 || order.tax > 0) && (
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{rs(order.subtotal)}</span>
            </div>
          )}
          {order.service > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Service charge</span>
              <span>{rs(order.service)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Tax</span>
              <span>{rs(order.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-ink-900">
            <span>Total</span>
            <span>{rs(order.total)}</span>
          </div>
        </div>
      </div>

      {order.note && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
          <StickyNote className="mt-0.5 size-4 shrink-0" />
          <p>
            <b>Note for the kitchen:</b> {order.note}
          </p>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Timeline</p>
        <ol className="space-y-0">
          {stamps.map((s, i) => {
            const gap = i > 0 ? Math.round((s.at - stamps[i - 1].at) / 60_000) : null;
            const last = i === stamps.length - 1;
            return (
              <li key={s.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("mt-1 size-2.5 rounded-full", s.status === "cancelled" ? "bg-ruby-500" : last ? "bg-gold-500" : "bg-leaf-500")} />
                  {!last && <span className="w-px flex-1 bg-ink-900/12" />}
                </div>
                <div className={cn("flex flex-1 items-baseline justify-between gap-3", !last && "pb-4")}>
                  <p className="text-sm font-medium text-ink-900">{STATUS_LABEL[s.status]}</p>
                  <p className="tabular text-xs text-ink-400">
                    {gap !== null && gap > 0 && <span className="mr-2 text-ink-300">+{gap} min</span>}
                    {clock(s.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {order.kotPrintedAt && !order.sample && (
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
          <Printer className="size-3.5" /> Kitchen ticket printed at {clock(order.kotPrintedAt)}
        </p>
      )}
      {order.sample && (
        <div className="mt-4">
          <Badge>This order is part of the sample history loaded for the demo.</Badge>
        </div>
      )}
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-900/[0.04] px-3.5 py-3">
      <p className="text-[11px] font-medium text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
