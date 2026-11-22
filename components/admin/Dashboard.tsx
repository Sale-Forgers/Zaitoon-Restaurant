"use client";

import {
  Armchair,
  Banknote,
  BellRing,
  ConciergeBell,
  CookingPot,
  Eraser,
  Play,
  QrCode,
  ReceiptText,
  RotateCcw,
  Send,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Timer,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button, Empty, Stars } from "@/components/ui";
import { useStaff } from "@/components/staff/StaffGate";
import { useLive, useSlowNow } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { ago, CALL_SHORT, cn, firstName, num, rs } from "@/lib/format";
import { hourOf } from "@/lib/time";
import type { AdminOverview, EventKind } from "@/lib/types";
import { compact, LoadError, Notice, PageHeader, Panel, SkeletonGrid, Stat, useAction, useConfirm } from "./parts";

export function Dashboard() {
  const overview = useLive(() => rpc("admin.overview"), "overview");
  const now = useSlowNow();
  const { session } = useStaff();
  const data = overview.data;

  const hour = now ? hourOf(now) : -1;
  const greeting = hour < 0 ? "Welcome" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = now
    ? new Date(now).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName(session.name)}`}
        subtitle={today ? `${today} · Here is how Zaitoon is doing right now.` : "Here is how Zaitoon is doing right now."}
      >
        <Link
          href="/admin/orders"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-semibold text-cream-50 shadow-soft transition hover:bg-ink-800"
        >
          <ShoppingBag className="size-4" /> Live orders
        </Link>
      </PageHeader>

      {!data ? (
        overview.error ? (
          <LoadError error={overview.error} retry={overview.refresh} />
        ) : (
          <div className="space-y-4">
            <SkeletonGrid />
            <SkeletonGrid />
            <div className="skeleton h-72 rounded-3xl" />
          </div>
        )
      ) : (
        <div className="space-y-5">
          {!data.durable && (
            <Notice title="Data is temporary on this server">
              No database is configured, so orders and guests can disappear when the server restarts. Add a Postgres
              connection string as <code className="rounded bg-ember-100 px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code>{" "}
              in the hosting settings to keep everything.
            </Notice>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <RevenueHero data={data} />
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <Stat label="Orders today" value={num(data.today.orders)} icon={<ReceiptText className="size-[18px]" />} tone="gold" hint="Cancelled orders are not counted" />
              <Stat
                label="Average ticket"
                value={data.today.orders ? rs(data.today.avgTicket) : "—"}
                icon={<Banknote className="size-[18px]" />}
                tone="olive"
                hint="Per order, today"
              />
              <Stat
                label="Average prep time"
                value={data.today.avgPrepMin === null ? "—" : data.today.avgPrepMin < 1 ? "< 1 min" : `${data.today.avgPrepMin} min`}
                icon={<Timer className="size-[18px]" />}
                tone="sky"
                hint="Order received to ready"
              />
              <Stat
                label="Guest rating"
                value={data.rating.avg === null ? "—" : data.rating.avg.toFixed(1)}
                icon={<Star className="size-[18px]" />}
                tone="gold"
              >
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Stars value={data.rating.avg ?? 0} size={14} />
                  <span className="text-xs text-ink-400">{data.rating.count} reviews</span>
                </div>
              </Stat>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Tables occupied"
              value={
                <>
                  {data.today.activeTables}
                  <span className="text-lg text-ink-300"> / {data.today.totalTables}</span>
                </>
              }
              icon={<Armchair className="size-[18px]" />}
            >
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/8">
                <div
                  className="bg-gold-sheen h-full rounded-full transition-all"
                  style={{ width: `${data.today.totalTables ? (data.today.activeTables / data.today.totalTables) * 100 : 0}%` }}
                />
              </div>
            </Stat>
            <Stat
              label="In the kitchen now"
              value={num(data.today.inKitchen)}
              icon={<CookingPot className="size-[18px]" />}
              tone={data.today.inKitchen ? "ember" : "plain"}
              hint="Received or being prepared"
            />
            <Stat
              label="Waiter calls waiting"
              value={num(data.today.openCalls)}
              icon={<ConciergeBell className="size-[18px]" />}
              tone={data.today.openCalls ? "ruby" : "plain"}
              hint={data.today.openCalls ? "Guests are waiting for a waiter" : "Nobody is waiting"}
            />
            <Stat
              label="Guests on record"
              value={num(data.guests.total)}
              icon={<Users className="size-[18px]" />}
              tone="olive"
              hint={`${data.guests.returning} came back more than once`}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="Revenue, last 7 days" subtitle="Daily sales in rupees" className="xl:col-span-2">
              <RevenueChart series={data.series} />
            </Panel>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <Panel title="How orders arrive" subtitle="Last 7 days">
                <SourceSplit sources={data.sources} />
              </Panel>
              <Panel title="Guests you can reach" subtitle="With notifications switched on">
                <GuestReach guests={data.guests} />
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="Busiest hours" subtitle="Orders by hour of the day, last 7 days">
              <HoursChart hours={data.hours} />
            </Panel>
            <Panel title="Top dishes" subtitle="Best sellers of the last 7 days">
              <TopDishes items={data.topItems} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="Live activity" subtitle="Everything happening on the floor, as it happens" className="xl:col-span-2" flush>
              <ActivityFeed events={data.events} now={now} />
            </Panel>
            <DemoTools />
          </div>
        </div>
      )}
    </>
  );
}

function RevenueHero({ data }: { data: AdminOverview }) {
  const yesterday = data.series[data.series.length - 2];
  const week = data.series.reduce((a, d) => a + d.revenue, 0);
  return (
    <div className="bg-ink-sheen relative overflow-hidden rounded-3xl p-6 text-sand-100 shadow-lift lg:col-span-2">
      <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-gold-500/15 blur-3xl" />
      <p className="text-[13px] font-medium text-sand-400">Revenue today</p>
      <p className="font-display text-gold-sheen tabular mt-2 text-[44px] leading-none font-semibold sm:text-[52px]">
        {rs(data.today.revenue)}
      </p>
      <p className="mt-3 text-sm text-sand-400">
        {data.today.orders} {data.today.orders === 1 ? "order" : "orders"} so far today
      </p>
      <div className="hairline-gold my-5 opacity-40" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-sand-500">Yesterday</p>
          <p className="tabular mt-0.5 text-base font-semibold text-sand-50">{yesterday ? rs(yesterday.revenue) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-sand-500">Last 7 days</p>
          <p className="tabular mt-0.5 text-base font-semibold text-sand-50">{rs(week)}</p>
        </div>
      </div>
    </div>
  );
}

/** Rounds the top of the scale to a tidy figure (20k, 50k, 100k…). */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * power;
}

function RevenueChart({ series }: { series: AdminOverview["series"] }) {
  const max = niceMax(Math.max(...series.map((s) => s.revenue), 1));
  const empty = series.every((s) => s.revenue === 0);
  if (empty) {
    return <Empty icon={<Banknote className="size-6" />} title="No sales yet" text="Revenue appears here as soon as the first order is placed." />;
  }
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-56 flex-1 gap-3">
        <div className="tabular flex w-9 shrink-0 flex-col justify-between text-right text-[10px] text-ink-300">
          <span className="-translate-y-1.5">{compact(max)}</span>
          <span>{compact(max / 2)}</span>
          <span className="translate-y-1.5">0</span>
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <span className="h-px bg-ink-900/8" />
            <span className="h-px bg-ink-900/5" />
            <span className="h-px bg-ink-900/12" />
          </div>
          <div className="absolute inset-0 flex items-end gap-2 sm:gap-4">
            {series.map((s) => {
              const isToday = s.label === "Today";
              return (
                <div key={s.day} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${s.label}: ${rs(s.revenue)} · ${s.orders} orders`}>
                  <span className={cn("tabular mb-1.5 text-[11px] font-semibold", isToday ? "text-gold-700" : "text-ink-400")}>
                    {s.revenue ? compact(s.revenue) : ""}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-16 rounded-t-xl transition-all duration-500 group-hover:opacity-90",
                      isToday ? "bg-gold-sheen" : "bg-ink-800",
                    )}
                    style={{ height: `${Math.max((s.revenue / max) * 100, s.revenue ? 1.5 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <span className="w-9 shrink-0" />
        <div className="flex flex-1 gap-2 sm:gap-4">
          {series.map((s) => (
            <div key={s.day} className="flex-1 text-center">
              <p className={cn("text-xs font-semibold", s.label === "Today" ? "text-gold-700" : "text-ink-600")}>{s.label}</p>
              <p className="tabular text-[10px] text-ink-300">{s.orders} orders</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

function HoursChart({ hours }: { hours: AdminOverview["hours"] }) {
  const max = Math.max(...hours.map((h) => h.orders), 1);
  const peak = hours.reduce((best, h) => (h.orders > best.orders ? h : best), hours[0]);
  if (!peak || peak.orders === 0) {
    return <Empty icon={<Timer className="size-6" />} title="Nothing to chart yet" text="Once orders come in you will see which hours are busiest." />;
  }
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-44 flex-1 items-end gap-1.5 sm:gap-2.5">
        {hours.map((h) => (
          <div key={h.hour} className="flex h-full flex-1 flex-col items-center justify-end" title={`${hourLabel(h.hour)}: ${h.orders} orders`}>
            <span className="tabular mb-1 text-[10px] font-semibold text-ink-400">{h.orders || ""}</span>
            <div
              className={cn("w-full rounded-t-lg transition-all duration-500", h.hour === peak.hour ? "bg-gold-sheen" : "bg-ink-900/15")}
              style={{ height: `${Math.max((h.orders / max) * 100, h.orders ? 3 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-ink-900/10 pt-2 sm:gap-2.5">
        {hours.map((h) => (
          <span key={h.hour} className={cn("flex-1 text-center text-[10px]", h.hour === peak.hour ? "font-bold text-gold-700" : "text-ink-300")}>
            {hourLabel(h.hour)}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ink-500">
        The rush peaks between <b className="text-ink-900">{hourLabel(peak.hour)}</b> and{" "}
        <b className="text-ink-900">{hourLabel(peak.hour + 1)}</b>: a good time to have every waiter on the floor.
      </p>
    </div>
  );
}

function TopDishes({ items }: { items: AdminOverview["topItems"] }) {
  if (!items.length) {
    return <Empty icon={<Star className="size-6" />} title="No best sellers yet" text="Your most ordered dishes will be ranked here." />;
  }
  const max = Math.max(...items.map((i) => i.qty), 1);
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-3.5">
          <span
            className={cn(
              "font-display flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              i === 0 ? "bg-gold-sheen text-ink-900" : "bg-ink-900/6 text-ink-500",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
              <p className="tabular shrink-0 text-[13px] font-semibold text-ink-700">{rs(item.revenue)}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/6">
                <div className={cn("h-full rounded-full", i === 0 ? "bg-gold-sheen" : "bg-olive-500")} style={{ width: `${(item.qty / max) * 100}%` }} />
              </div>
              <span className="tabular w-14 shrink-0 text-right text-xs text-ink-400">{item.qty} sold</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SourceSplit({ sources }: { sources: AdminOverview["sources"] }) {
  const total = sources.qr + sources.waiter;
  const qrPct = total ? Math.round((sources.qr / total) * 100) : 0;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-ink-900/8">
        <div className="bg-gold-sheen h-full transition-all duration-500" style={{ width: `${qrPct}%` }} />
        <div className="h-full flex-1 bg-ink-800" />
      </div>
      <div className="mt-4 space-y-3">
        <SplitRow icon={QrCode} swatch="bg-gold-sheen" label="From guests' phones" detail="QR scan or NFC tap" value={total ? `${qrPct}%` : "—"} count={sources.qr} />
        <SplitRow icon={ConciergeBell} swatch="bg-ink-800" label="Taken by waiters" detail="On the waiter tablet" value={total ? `${100 - qrPct}%` : "—"} count={sources.waiter} />
      </div>
    </div>
  );
}

function SplitRow({
  icon: Icon,
  swatch,
  label,
  detail,
  value,
  count,
}: {
  icon: LucideIcon;
  swatch: string;
  label: string;
  detail: string;
  value: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-2.5 shrink-0 rounded-full", swatch)} />
      <Icon className="size-4 shrink-0 text-ink-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{label}</p>
        <p className="truncate text-xs text-ink-400">{detail}</p>
      </div>
      <div className="text-right">
        <p className="font-display tabular text-lg leading-none font-semibold">{value}</p>
        <p className="tabular mt-0.5 text-[11px] text-ink-400">{count} orders</p>
      </div>
    </div>
  );
}

function GuestReach({ guests }: { guests: AdminOverview["guests"] }) {
  const pct = guests.total ? Math.round((guests.push / guests.total) * 100) : 0;
  return (
    <div>
      <div className="flex items-end gap-3">
        <p className="font-display tabular text-[40px] leading-none font-semibold">{guests.push}</p>
        <p className="pb-1 text-sm text-ink-400">
          of {guests.total} guests
          <br />
          <span className="font-semibold text-leaf-600">{pct}% reachable</span>
        </p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-900/8">
        <div className="h-full rounded-full bg-leaf-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <Link
        href="/admin/notifications"
        className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-gold-700 underline-offset-4 hover:underline"
      >
        <Smartphone className="size-4" /> Send them an offer
      </Link>
    </div>
  );
}

const EVENT_STYLE: Record<EventKind, { icon: LucideIcon; tone: string }> = {
  order: { icon: ShoppingBag, tone: "bg-gold-100 text-gold-700" },
  status: { icon: CookingPot, tone: "bg-ember-100 text-ember-700" },
  call: { icon: BellRing, tone: "bg-ruby-100 text-ruby-600" },
  guest: { icon: UserRound, tone: "bg-olive-100 text-olive-700" },
  feedback: { icon: Star, tone: "bg-gold-100 text-gold-700" },
  push: { icon: Send, tone: "bg-sky-100 text-sky-600" },
  visit: { icon: ReceiptText, tone: "bg-ink-900/6 text-ink-600" },
  system: { icon: Sparkles, tone: "bg-ink-900/6 text-ink-600" },
};

function ActivityFeed({ events, now }: { events: AdminOverview["events"]; now: number }) {
  if (!events.length) {
    return <Empty icon={<Sparkles className="size-6" />} title="All quiet" text="Orders, waiter calls and reviews show up here the moment they happen." />;
  }
  return (
    <ul className="thin-scrollbar max-h-[440px] divide-y divide-ink-900/6 overflow-y-auto">
      {events.map((e) => {
        const style = EVENT_STYLE[e.kind] ?? EVENT_STYLE.system;
        return (
          <li key={e.id} className="flex items-start gap-3.5 px-5 py-3.5 sm:px-6">
            <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", style.tone)}>
              <style.icon className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug text-ink-700">{e.text}</p>
            <span className="shrink-0 pt-0.5 text-xs whitespace-nowrap text-ink-300">{now ? ago(e.ts, now) : ""}</span>
          </li>
        );
      })}
    </ul>
  );
}

function DemoTools() {
  const { run, busy } = useAction();
  const confirm = useConfirm();

  const reset = async () => {
    const ok = await confirm({
      title: "Reset the demo data?",
      text: "Everything returns to the starting point: Zaitoon's menu, 16 tables and two weeks of sample history. Orders, guests and menu changes made since then are removed. Settings go back to their defaults.",
      confirmLabel: "Reset everything",
      danger: true,
    });
    if (ok) await run("reset", () => rpc("admin.demo.reset", { samples: true }), "Demo data has been reset");
  };

  const clear = async () => {
    const ok = await confirm({
      title: "Remove the sample history?",
      text: "The sample guests, orders, reviews and campaigns are deleted so the reports only show real activity. The menu, tables and settings stay as they are.",
      confirmLabel: "Remove samples",
      danger: true,
    });
    if (ok) await run("clear", () => rpc("admin.demo.clearSamples"), "Sample history removed");
  };

  return (
    <Panel title="Demo tools" subtitle="Handy when you are presenting without a phone in hand">
      <div className="space-y-2.5">
        <Button
          variant="gold"
          block
          icon={<Play className="size-4" />}
          loading={busy === "order"}
          onClick={() =>
            run("order", () => rpc("admin.demo.order"), (o) => `Order #${o.number} placed from Table ${o.tableNumber}`)
          }
        >
          Simulate a guest order
        </Button>
        <Button
          variant="ink"
          block
          icon={<BellRing className="size-4" />}
          loading={busy === "call"}
          onClick={() =>
            run("call", () => rpc("admin.demo.call"), (c) => `Table ${c.tableNumber}: ${CALL_SHORT[c.type].toLowerCase()}`)
          }
        >
          Simulate a waiter call
        </Button>
        <p className="px-1 pt-1 text-xs leading-relaxed text-ink-400">
          Watch them arrive on the kitchen display and the waiter app, exactly like an order from a guest&apos;s phone.
        </p>
      </div>
      <div className="mt-5 space-y-1 border-t border-ink-900/8 pt-4">
        <Button variant="ghost" size="sm" block className="justify-start" icon={<RotateCcw className="size-3.5" />} loading={busy === "reset"} onClick={reset}>
          Reset demo data to the starting point
        </Button>
        <Button variant="ghost" size="sm" block className="justify-start" icon={<Eraser className="size-3.5" />} loading={busy === "clear"} onClick={clear}>
          Remove the sample history
        </Button>
      </div>
    </Panel>
  );
}
