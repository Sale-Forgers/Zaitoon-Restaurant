"use client";

import { Database, Eye, EyeOff, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Badge, Button, Card, Input, Label, Toggle } from "@/components/ui";
import { useLive } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { cn } from "@/lib/format";
import type { Settings, StaffRole } from "@/lib/types";
import { LoadError, PageHeader, SkeletonList, useAction } from "./parts";

export function SettingsPage() {
  const settings = useLive(() => rpc("admin.settings.get"), "settings");
  const data = settings.data;

  return (
    <>
      <PageHeader title="Settings" subtitle="How the system behaves for guests, the kitchen and your staff. Changes apply everywhere straight away." />
      {!data ? (
        settings.error ? (
          <LoadError error={settings.error} retry={settings.refresh} />
        ) : (
          <SkeletonList rows={6} />
        )
      ) : (
        <div className="divide-y divide-ink-900/8">
          {/* Each form remounts when its saved values change, so it always starts from what is stored. */}
          <RestaurantSection key={`r:${JSON.stringify(data.restaurant)}`} value={data.restaurant} />
          <OrderingSection key={`o:${JSON.stringify(data.ordering)}`} value={data.ordering} />
          <KitchenSection key={`k:${JSON.stringify(data.kitchen)}`} value={data.kitchen} />
          <NotificationSection key={`n:${JSON.stringify(data.notifications)}`} value={data.notifications} />
          <StaffSection key={`s:${JSON.stringify(data.staff)}`} value={data.staff} />
          <SystemSection />
        </div>
      )}
    </>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-x-10 gap-y-4 py-8 first:pt-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{text}</p>
      </div>
      <Card className="p-5 sm:p-6">{children}</Card>
    </section>
  );
}

function SaveBar({ dirty, busy, onSave, note }: { dirty: boolean; busy: boolean; onSave: () => void; note?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-ink-900/8 pt-4">
      {note && <p className="mr-auto text-xs text-ruby-500">{note}</p>}
      <Button variant="gold" disabled={!dirty || Boolean(note)} loading={busy} onClick={onSave}>
        Save changes
      </Button>
    </div>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ───────────────────────────── Restaurant ─────────────────────────────

function RestaurantSection({ value }: { value: Settings["restaurant"] }) {
  const { run, busy } = useAction();
  const [form, setForm] = useState(value);
  const set = (patch: Partial<Settings["restaurant"]>) => setForm({ ...form, ...patch });

  return (
    <Section title="Restaurant details" text="Shown to guests on the welcome screen, on bills and in the footer of the menu.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Label>Restaurant name</Label>
          <Input value={form.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="block sm:col-span-2">
          <Label>Tagline</Label>
          <Input value={form.tagline} maxLength={120} onChange={(e) => set({ tagline: e.target.value })} />
        </label>
        <label className="block sm:col-span-2">
          <Label>Address</Label>
          <Input value={form.address} maxLength={200} onChange={(e) => set({ address: e.target.value })} />
        </label>
        <label className="block">
          <Label>Phone</Label>
          <Input value={form.phone} maxLength={40} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
        </label>
        <label className="block">
          <Label>Opening hours</Label>
          <Input value={form.hours} maxLength={120} onChange={(e) => set({ hours: e.target.value })} />
        </label>
      </div>
      <SaveBar
        dirty={!same(form, value)}
        busy={busy === "save"}
        note={form.name.trim().length < 2 ? "The restaurant needs a name." : undefined}
        onSave={() => run("save", () => rpc("admin.settings.save", { patch: { restaurant: form } }), "Restaurant details saved")}
      />
    </Section>
  );
}

// ───────────────────────────── Ordering ─────────────────────────────

function OrderingSection({ value }: { value: Settings["ordering"] }) {
  const { run, busy } = useAction();
  const [enabled, setEnabled] = useState(value.enabled);
  const [service, setService] = useState(String(value.servicePct));
  const [tax, setTax] = useState(String(value.taxPct));
  const [taxLabel, setTaxLabel] = useState(value.taxLabel);

  const next: Settings["ordering"] = {
    enabled,
    servicePct: Number(service) || 0,
    taxPct: Number(tax) || 0,
    taxLabel: taxLabel.trim() || "Tax",
  };
  const outOfRange = [next.servicePct, next.taxPct].some((n) => n < 0 || n > 30);

  return (
    <Section title="Ordering & charges" text="Whether guests can order from their phone, and what is added to the bill on top of the menu prices.">
      <Row title="Accept orders from guests' phones" text="Switch off to pause QR ordering, for example when the kitchen is closing. Waiters can still take orders.">
        <Toggle checked={enabled} onChange={setEnabled} label="Accept orders from guests' phones" />
      </Row>
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-ink-900/8 pt-5 sm:grid-cols-3">
        <label className="block">
          <Label hint="0 = none">Service charge %</Label>
          <Input type="number" inputMode="decimal" min={0} max={30} step="0.5" value={service} onChange={(e) => setService(e.target.value)} />
        </label>
        <label className="block">
          <Label hint="0 = none">Tax %</Label>
          <Input type="number" inputMode="decimal" min={0} max={30} step="0.5" value={tax} onChange={(e) => setTax(e.target.value)} />
        </label>
        <label className="block">
          <Label>Tax name on the bill</Label>
          <Input value={taxLabel} maxLength={12} placeholder="GST" onChange={(e) => setTaxLabel(e.target.value)} />
        </label>
      </div>
      <p className="mt-3 text-xs text-ink-400">Both are calculated on the food total and shown as separate lines on the guest&apos;s phone and the printed bill.</p>
      <SaveBar
        dirty={!same(next, value)}
        busy={busy === "save"}
        note={outOfRange ? "Charges must be between 0 and 30 percent." : undefined}
        onSave={() => run("save", () => rpc("admin.settings.save", { patch: { ordering: next } }), "Ordering settings saved")}
      />
    </Section>
  );
}

// ───────────────────────────── Kitchen ─────────────────────────────

function KitchenSection({ value }: { value: Settings["kitchen"] }) {
  const { run, busy } = useAction();
  const [autoPrint, setAutoPrint] = useState(value.autoPrintKot);
  const [minutes, setMinutes] = useState(String(value.targetMinutes));
  const next: Settings["kitchen"] = { autoPrintKot: autoPrint, targetMinutes: Math.round(Number(minutes)) || 0 };
  const bad = next.targetMinutes < 5 || next.targetMinutes > 90;

  return (
    <Section title="Kitchen" text="How the kitchen display treats new tickets.">
      <Row
        title="Print a kitchen ticket for every new order"
        text="The kitchen screen prints the ticket (KOT) the moment an order arrives. Each screen can also switch this on or off for itself."
      >
        <Toggle checked={autoPrint} onChange={setAutoPrint} label="Print a kitchen ticket for every new order" />
      </Row>
      <div className="mt-4 border-t border-ink-900/8 pt-5">
        <label className="block max-w-xs">
          <Label hint="minutes">Flag a ticket as late after</Label>
          <Input type="number" inputMode="numeric" min={5} max={90} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <p className="mt-2 text-xs text-ink-400">Tickets older than this turn red on the kitchen display so the team can catch up.</p>
      </div>
      <SaveBar
        dirty={!same(next, value)}
        busy={busy === "save"}
        note={bad ? "Choose between 5 and 90 minutes." : undefined}
        onSave={() => run("save", () => rpc("admin.settings.save", { patch: { kitchen: next } }), "Kitchen settings saved")}
      />
    </Section>
  );
}

// ───────────────────────────── Guest notifications ─────────────────────────────

function NotificationSection({ value }: { value: Settings["notifications"] }) {
  const { run, busy } = useAction();
  const [form, setForm] = useState(value);

  return (
    <Section title="Guest notifications" text="Automatic messages sent to the guest's phone during and after the meal.">
      <div className="divide-y divide-ink-900/8">
        <Row title="Order updates" text="Tell the guest when the kitchen starts cooking, when the order is ready, when the waiter is bringing it and when it is served.">
          <Toggle checked={form.orderUpdates} onChange={(v) => setForm({ ...form, orderUpdates: v })} label="Order updates" />
        </Row>
        <Row title="Ask for a review after the meal" text="When the bill is closed, invite the guest to rate the food, the service and the ambience.">
          <Toggle checked={form.feedbackRequest} onChange={(v) => setForm({ ...form, feedbackRequest: v })} label="Ask for a review after the meal" />
        </Row>
      </div>
      <SaveBar
        dirty={!same(form, value)}
        busy={busy === "save"}
        onSave={() => run("save", () => rpc("admin.settings.save", { patch: { notifications: form } }), "Notification settings saved")}
      />
    </Section>
  );
}

// ───────────────────────────── Staff ─────────────────────────────

const PIN_ROLES: { role: StaffRole; label: string; text: string }[] = [
  { role: "admin", label: "Manager", text: "Opens every screen" },
  { role: "kitchen", label: "Kitchen", text: "Opens the kitchen display" },
  { role: "waiter", label: "Waiters", text: "Opens the waiter app" },
];

function StaffSection({ value }: { value: Settings["staff"] }) {
  const { run, busy } = useAction();
  const [waiters, setWaiters] = useState(value.waiters);
  const [name, setName] = useState("");
  const [pins, setPins] = useState<Record<StaffRole, string>>({ admin: "", kitchen: "", waiter: "" });
  const [reveal, setReveal] = useState(false);

  const addWaiter = () => {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
    if (clean && !waiters.some((w) => w.toLowerCase() === clean.toLowerCase())) setWaiters([...waiters, clean]);
    setName("");
  };

  const badPin = PIN_ROLES.some(({ role }) => pins[role] !== "" && !/^\d{4,6}$/.test(pins[role]));
  const pinsChanged = PIN_ROLES.some(({ role }) => pins[role] !== "");
  const note = waiters.length === 0 ? "Add at least one waiter." : badPin ? "PINs must be 4 to 6 digits." : undefined;

  return (
    <Section title="Staff & PINs" text="Who can sign in on the waiter app, and the PIN that unlocks each screen.">
      <Label hint={`${waiters.length} on the team`}>Waiters</Label>
      <div className="flex flex-wrap gap-2">
        {waiters.map((w) => (
          <span key={w} className="inline-flex items-center gap-1 rounded-full bg-ink-900 py-1.5 pr-1.5 pl-3.5 text-[13px] font-semibold text-cream-50">
            {w}
            <button
              onClick={() => setWaiters(waiters.filter((x) => x !== w))}
              aria-label={`Remove ${w}`}
              className="flex size-6 items-center justify-center rounded-full text-sand-400 transition hover:bg-white/15 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex max-w-sm gap-2">
        <Input
          value={name}
          maxLength={24}
          placeholder="Add a waiter's name"
          className="h-11"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWaiter()}
        />
        <Button variant="soft" icon={<Plus className="size-4" />} onClick={addWaiter} disabled={!name.trim()}>
          Add
        </Button>
      </div>

      <div className="mt-6 border-t border-ink-900/8 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink-700">Screen PINs</p>
          <button onClick={() => setReveal((r) => !r)} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900">
            {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {reveal ? "Hide current PINs" : "Show current PINs"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PIN_ROLES.map(({ role, label, text }) => (
            <label key={role} className="block rounded-2xl bg-ink-900/[0.04] p-3.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink-900">{label}</span>
                <span className="tabular font-mono text-xs text-ink-500">{reveal ? value.pins[role] : "•".repeat(value.pins[role].length)}</span>
              </span>
              <span className="mt-0.5 block text-xs text-ink-400">{text}</span>
              <Input
                value={pins[role]}
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                placeholder="New PIN"
                className={cn(
                  "mt-3 h-11 text-center font-mono tracking-[0.3em] placeholder:font-sans placeholder:tracking-normal",
                  pins[role] && !/^\d{4,6}$/.test(pins[role]) && "border-ruby-400",
                )}
                onChange={(e) => setPins({ ...pins, [role]: e.target.value.replace(/\D/g, "") })}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">Leave a field empty to keep that PIN. Use 4 to 6 digits and change the demo PINs before going live.</p>
      </div>

      <SaveBar
        dirty={!same(waiters, value.waiters) || pinsChanged}
        busy={busy === "save"}
        note={note}
        onSave={() => run("save", () => rpc("admin.settings.save", { patch: { staff: { waiters, pins } } }), "Staff settings saved")}
      />
    </Section>
  );
}

// ───────────────────────────── System ─────────────────────────────

function SystemSection() {
  const overview = useLive(() => rpc("admin.overview"), "system");
  const data = overview.data;
  return (
    <Section title="System" text="Where your data lives.">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ink-900/6 text-ink-600">
          <Database className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
            {data ? data.storage : "Checking storage…"}
            {data && (data.durable ? <Badge tone="leaf">Saved permanently</Badge> : <Badge tone="ember">Temporary</Badge>)}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-400">
            {!data
              ? "One moment."
              : data.durable
                ? "Orders, guests, the menu and these settings are stored and survive restarts."
                : "No database is configured on this server, so data can disappear when it restarts. Add a Postgres connection string as DATABASE_URL in the hosting settings."}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-900/8 pt-4 text-[13px]">
        <span className="text-ink-400">Presenting the system?</span>
        <Link href="/admin" className="font-semibold text-gold-700 underline-offset-4 hover:underline">
          Demo tools are on the Dashboard
        </Link>
        <Link href="/admin/tables" className="font-semibold text-gold-700 underline-offset-4 hover:underline">
          Wi-Fi and QR codes are under Tables & QR
        </Link>
      </div>
    </Section>
  );
}
