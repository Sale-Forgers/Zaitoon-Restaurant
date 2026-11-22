"use client";

import {
  BellRing,
  ChefHat,
  Check,
  ConciergeBell,
  Flame,
  History,
  Printer,
  RotateCcw,
  Smartphone,
  Timer,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePrint } from "@/components/print/PrintHost";
import { KotTicket } from "@/components/print/Ticket";
import { Splash } from "@/components/brand";
import { Button, Empty, Segmented, Sheet, useToast } from "@/components/ui";
import { useNow } from "@/lib/client/live";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { chime, unlockSound } from "@/lib/client/sound";
import { clock, cn, elapsed, STATUS_LABEL } from "@/lib/format";
import { lineOptions } from "@/lib/pricing";
import type { Order, OrderStatus } from "@/lib/types";
import { StaffBar } from "./StaffGate";
import { useBoard, useDevicePref, useOrderActions } from "./useBoard";

type Lane = "received" | "preparing" | "ready";

const LANES: { key: Lane; title: string; empty: string; accent: string; dot: string }[] = [
  { key: "received", title: "New orders", empty: "No new orders", accent: "border-sky-400", dot: "bg-sky-400" },
  { key: "preparing", title: "Preparing", empty: "Nothing on the stove", accent: "border-gold-400", dot: "bg-gold-400" },
  { key: "ready", title: "Ready for pickup", empty: "The pass is clear", accent: "border-leaf-400", dot: "bg-leaf-400" },
];

const NEXT: Record<Lane, { status: OrderStatus; label: string; style: string; icon: ReactNode }> = {
  received: {
    status: "preparing",
    label: "Start preparing",
    style: "bg-gold-sheen text-ink-900",
    icon: <Flame className="size-5" />,
  },
  preparing: {
    status: "ready",
    label: "Mark ready",
    style: "bg-leaf-500 text-white",
    icon: <Check className="size-5" strokeWidth={3} />,
  },
  ready: {
    status: "picked_up",
    label: "Picked up",
    style: "bg-sand-50 text-ink-900",
    icon: <ConciergeBell className="size-5" />,
  },
};

const PREV: Record<Lane, OrderStatus | null> = { received: null, preparing: "received", ready: "preparing" };

export function KitchenBoard() {
  const board = useBoard();
  const print = usePrint();
  const toast = useToast();
  const { busy, setStatus } = useOrderActions();
  const [sound, setSound] = useDevicePref("zr.kds.sound", true);
  const [autoPrintPref, setAutoPrint] = useDevicePref("zr.kds.autoprint.set", false);
  const [autoPrintOn, setAutoPrintOn] = useDevicePref("zr.kds.autoprint", false);
  const [lane, setLane] = useState<Lane>("received");
  const [preview, setPreview] = useState<Order | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);
  const printing = useRef(false);

  const orders = useMemo(() => board.data?.orders ?? [], [board.data]);
  const target = board.data?.settings.kitchen.targetMinutes ?? 20;
  // Until someone flips the switch on this screen, follow the manager's default.
  const autoPrint = autoPrintPref ? autoPrintOn : (board.data?.settings.kitchen.autoPrintKot ?? false);

  const lanes = useMemo(() => {
    const by: Record<Lane, Order[]> = { received: [], preparing: [], ready: [] };
    for (const o of orders) if (o.status in by) by[o.status as Lane].push(o);
    return by;
  }, [orders]);

  const recent = useMemo(
    () =>
      orders
        .filter((o) => o.status === "picked_up" || o.status === "served" || o.status === "cancelled")
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 30),
    [orders],
  );

  // Chime and highlight when a ticket arrives.
  useEffect(() => {
    if (!board.data) return;
    const ids = new Set(lanes.received.map((o) => o.id));
    if (seen.current) {
      const arrived = [...ids].filter((id) => !seen.current!.has(id));
      if (arrived.length) {
        if (sound) chime("order");
        setFresh((f) => new Set([...f, ...arrived]));
        window.setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !arrived.includes(id)))), 9000);
      }
    }
    seen.current = new Set([...(seen.current ?? []), ...ids]);
  }, [board.data, lanes.received, sound]);

  // Automatic KOT: print each new ticket once, one at a time.
  useEffect(() => {
    if (!autoPrint || printing.current) return;
    const next = lanes.received.find((o) => !o.kotPrintedAt);
    if (!next) return;
    printing.current = true;
    rpc("staff.order.kot", { id: next.id })
      .then(() => print(<KotTicket order={{ ...next, kotPrintedAt: Date.now() }} />))
      .catch(() => {})
      .finally(() => {
        window.setTimeout(() => (printing.current = false), 1200);
      });
  }, [autoPrint, lanes.received, print]);

  if (!board.data) return <Splash label="Loading the kitchen…" />;

  const printKot = async (order: Order) => {
    print(<KotTicket order={{ ...order, kotPrintedAt: Date.now() }} />);
    try {
      await rpc("staff.order.kot", { id: order.id });
    } catch {
      /* the ticket still printed */
    }
  };

  const callWaiter = async (order: Order) => {
    try {
      await rpc("staff.call.create", {
        tableId: order.tableId,
        type: "waiter",
        note: `Order #${order.number} is waiting at the pass`,
      });
      toast({ title: `Waiters alerted for Table ${order.tableNumber}` });
    } catch (e) {
      toast({ title: "Could not alert the waiters", text: errorMessage(e), tone: "error" });
    }
  };

  const counts = { received: lanes.received.length, preparing: lanes.preparing.length, ready: lanes.ready.length };
  const quiet = counts.received + counts.preparing + counts.ready === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950 text-sand-50" onPointerDown={unlockSound}>
      <StaffBar title="Kitchen Display" subtitle={`${counts.received + counts.preparing} cooking · ${counts.ready} at the pass`}>
        <BarButton
          on={autoPrint}
          label={autoPrint ? "Auto-print KOT is on" : "Auto-print KOT is off"}
          onClick={() => {
            setAutoPrint(true);
            setAutoPrintOn(!autoPrint);
            toast({
              title: !autoPrint ? "KOT will print automatically" : "Automatic KOT printing is off",
              text: !autoPrint ? "Every new order prints a kitchen ticket on this screen's printer." : undefined,
            });
          }}
        >
          <Printer className="size-5" />
          <span className="hidden text-xs font-semibold lg:inline">Auto KOT</span>
        </BarButton>
        <BarButton on={sound} label={sound ? "Sound on" : "Sound off"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </BarButton>
        <BarButton label="Recently completed" onClick={() => setHistoryOpen(true)}>
          <History className="size-5" />
          <span className="hidden text-xs font-semibold lg:inline">Done</span>
        </BarButton>
      </StaffBar>

      {/* Lane switcher for small screens */}
      <div className="border-b border-white/6 px-4 py-3 lg:hidden">
        <Segmented
          dark
          className="w-full [&>button]:flex-1"
          value={lane}
          onChange={setLane}
          options={LANES.map((l) => ({
            value: l.key,
            label: (
              <span className="flex items-center justify-center gap-1.5">
                {l.title.split(" ")[0]}
                <span className="tabular rounded-full bg-black/25 px-1.5 text-[11px]">{counts[l.key]}</span>
              </span>
            ),
          }))}
        />
      </div>

      {quiet ? (
        <div className="flex flex-1 items-center justify-center">
          <Empty
            dark
            icon={<ChefHat className="size-7" />}
            title="All caught up"
            text="New orders from tables and waiters appear here the moment they are placed."
          />
        </div>
      ) : (
        <div className="grid flex-1 gap-4 p-4 lg:grid-cols-3 lg:gap-5 lg:p-5">
          {LANES.map((l) => (
            <section key={l.key} className={cn("min-w-0 flex-col", lane === l.key ? "flex" : "hidden lg:flex")}>
              <header className="mb-3 flex items-center gap-2.5 px-1">
                <span className={cn("size-2.5 rounded-full", l.dot)} />
                <h2 className="font-display text-xl font-semibold">{l.title}</h2>
                <span className="tabular ml-auto rounded-full bg-white/8 px-3 py-1 text-sm font-bold">{counts[l.key]}</span>
              </header>
              <div className="space-y-3">
                {lanes[l.key].length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/10 py-10 text-center text-sm text-sand-500">
                    {l.empty}
                  </div>
                )}
                {lanes[l.key].map((order) => (
                  <Ticket
                    key={order.id}
                    order={order}
                    lane={l.key}
                    accent={l.accent}
                    target={target}
                    fresh={fresh.has(order.id)}
                    busy={busy === order.id}
                    onAdvance={() => setStatus(order.id, NEXT[l.key].status)}
                    onBack={PREV[l.key] ? () => setStatus(order.id, PREV[l.key]!) : undefined}
                    onCancel={
                      l.key === "received"
                        ? () => window.confirm(`Cancel order #${order.number} for Table ${order.tableNumber}?`) && setStatus(order.id, "cancelled")
                        : undefined
                    }
                    onPrint={() => setPreview(order)}
                    onCallWaiter={l.key === "ready" ? () => callWaiter(order) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* KOT preview */}
      <Sheet open={Boolean(preview)} onClose={() => setPreview(null)} title="Kitchen ticket" dark size="sm">
        {preview && (
          <div className="flex flex-col items-center">
            <div className="overflow-hidden rounded-lg shadow-lift">
              <KotTicket order={preview} />
            </div>
            <Button
              variant="gold"
              size="lg"
              block
              className="mt-5"
              icon={<Printer className="size-5" />}
              onClick={() => {
                void printKot(preview);
                setPreview(null);
              }}
            >
              Print KOT
            </Button>
            <p className="mt-3 text-center text-xs text-sand-500">
              Sized for 80 mm kitchen printers. {preview.kotPrintedAt ? `Printed at ${clock(preview.kotPrintedAt)}.` : "Not printed yet."}
            </p>
          </div>
        )}
      </Sheet>

      {/* Recently completed */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Recently completed" dark size="md">
        {recent.length === 0 ? (
          <Empty dark icon={<History className="size-6" />} title="Nothing yet" text="Orders that leave the kitchen are listed here." />
        ) : (
          <ul className="space-y-2">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3">
                <span className="font-display flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg font-semibold">
                  {o.tableNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    #{o.number} · {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                  </p>
                  <p className="text-xs text-sand-500">
                    {STATUS_LABEL[o.status]} at {clock(o.updatedAt)}
                    {o.waiter ? ` · ${o.waiter}` : ""}
                  </p>
                </div>
                {o.status === "picked_up" && (
                  <button
                    onClick={() => setStatus(o.id, "ready")}
                    className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-sand-200 hover:bg-white/15"
                  >
                    <RotateCcw className="size-3.5" /> Back to pass
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}

function BarButton({
  children,
  onClick,
  label,
  on,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  on?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cn(
        "flex h-10 items-center gap-2 rounded-full px-3 transition",
        on ? "bg-gold-400/15 text-gold-300 ring-1 ring-gold-400/40" : "bg-white/6 text-sand-300 hover:bg-white/12",
      )}
    >
      {children}
    </button>
  );
}

function Elapsed({ since, target, done }: { since: number; target: number; done?: boolean }) {
  const now = useNow();
  if (!now) return null;
  const minutes = (now - since) / 60_000;
  const late = !done && minutes >= target;
  const warm = !done && minutes >= target * 0.7;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold",
        late ? "bg-ruby-500 text-white" : warm ? "bg-ember-500/20 text-ember-400" : "bg-white/8 text-sand-200",
      )}
    >
      <Timer className="size-3.5" />
      {elapsed(since, now)}
    </span>
  );
}

function Ticket({
  order,
  lane,
  accent,
  target,
  fresh,
  busy,
  onAdvance,
  onBack,
  onCancel,
  onPrint,
  onCallWaiter,
}: {
  order: Order;
  lane: Lane;
  accent: string;
  target: number;
  fresh: boolean;
  busy: boolean;
  onAdvance: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  onPrint: () => void;
  onCallWaiter?: () => void;
}) {
  const next = NEXT[lane];
  // New and cooking tickets count from arrival; ready ones count the wait at the pass.
  const since = lane === "ready" ? (order.times.ready ?? order.createdAt) : order.createdAt;

  return (
    <article
      className={cn(
        "animate-rise overflow-hidden rounded-3xl border-l-[6px] bg-ink-800 shadow-lift",
        accent,
        fresh && "animate-ring ring-2 ring-sky-400/70",
      )}
      style={fresh ? ({ "--ring-color": "rgb(74 163 223 / 0.6)" } as React.CSSProperties) : undefined}
    >
      <header className="flex items-start gap-3 px-4 pt-4">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/[0.07]">
          <span className="text-[9px] font-semibold tracking-widest text-sand-500 uppercase">Table</span>
          <span className="font-display text-2xl leading-none font-semibold">{order.tableNumber}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="tabular text-lg font-bold">#{order.number}</span>
            {fresh && <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">New</span>}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-sand-400">
            {order.source === "qr" ? <Smartphone className="size-3.5" /> : <UserRound className="size-3.5" />}
            {order.source === "qr" ? `QR · ${order.guestName}` : `Waiter · ${order.waiter ?? ""}`}
            <span className="text-sand-500">· {clock(order.createdAt)}</span>
          </p>
        </div>
        <Elapsed since={since} target={lane === "ready" ? 5 : target} />
      </header>

      <ul className="mt-3 space-y-2 px-4">
        {order.lines.map((l, i) => (
          <li key={i} className="flex gap-3">
            <span className="tabular w-8 shrink-0 text-right text-lg leading-tight font-bold text-gold-300">{l.qty}×</span>
            <div className="min-w-0">
              <p className="text-[17px] leading-tight font-semibold">{l.name}</p>
              {lineOptions(l) && <p className="mt-0.5 text-sm text-sand-400">{lineOptions(l)}</p>}
              {l.note && (
                <p className="mt-1 inline-block rounded-lg bg-ember-500/20 px-2 py-0.5 text-sm font-semibold text-ember-400">
                  {l.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mx-4 mt-3 rounded-xl bg-gold-400/12 px-3 py-2 text-sm font-medium text-gold-200">Note: {order.note}</p>
      )}

      <footer className="mt-4 flex items-center gap-2 border-t border-white/6 p-3">
        <button
          onClick={onAdvance}
          disabled={busy}
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-60",
            next.style,
          )}
        >
          {next.icon}
          {next.label}
        </button>
        {onCallWaiter && (
          <IconAction label="Alert waiters" onClick={onCallWaiter}>
            <BellRing className="size-5" />
          </IconAction>
        )}
        <IconAction label={order.kotPrintedAt ? "KOT (printed)" : "KOT"} onClick={onPrint} on={Boolean(order.kotPrintedAt)}>
          <Printer className="size-5" />
        </IconAction>
        {onBack && (
          <IconAction label="Move back" onClick={onBack}>
            <RotateCcw className="size-5" />
          </IconAction>
        )}
        {onCancel && (
          <IconAction label="Cancel order" onClick={onCancel}>
            <X className="size-5" />
          </IconAction>
        )}
      </footer>
    </article>
  );
}

function IconAction({
  children,
  label,
  onClick,
  on,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  on?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-2xl transition active:scale-95",
        on ? "bg-leaf-500/15 text-leaf-400" : "bg-white/[0.07] text-sand-300 hover:bg-white/12",
      )}
    >
      {children}
    </button>
  );
}
