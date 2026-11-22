"use client";

import {
  Armchair,
  CircleCheck,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Nfc,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  SmartphoneNfc,
  Trash2,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePrint } from "@/components/print/PrintHost";
import { Qr } from "@/components/Qr";
import { Badge, Button, Card, Empty, IconButton, Input, Label, Segmented, Sheet, Toggle, useToast } from "@/components/ui";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { cn, rs, TABLE_STATE_LABEL, wifiQr } from "@/lib/format";
import type { Settings, TableState, TableView } from "@/lib/types";
import { useBoard } from "./AdminShell";
import { LoadError, Notice, PageHeader, Panel, SkeletonGrid, useAction, useConfirm } from "./parts";

type WifiSettings = Settings["wifi"];

const STATE_TONE: Record<TableState, "neutral" | "olive" | "ember" | "leaf" | "ruby" | "gold"> = {
  free: "neutral",
  seated: "olive",
  cooking: "ember",
  ready: "leaf",
  calling: "ruby",
  bill: "gold",
};

const subscribeNever = () => () => {};
/** The address this admin panel is open on (empty until the page is in the browser). */
function useOrigin() {
  return useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );
}

const isLocalAddress = (base: string) => {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname);
  } catch {
    return false;
  }
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs https: fall back to the old selection trick.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

interface Draft {
  id?: string;
  number: string;
  label: string;
  zone: string;
  seats: string;
  active: boolean;
}

export function TablesPage() {
  const board = useBoard();
  const origin = useOrigin();
  const print = usePrint();
  const toast = useToast();
  const confirm = useConfirm();
  const { run, busy } = useAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [nfcFor, setNfcFor] = useState<string | null>(null);
  const closeDraft = useCallback(() => setDraft(null), []);
  const closeNfc = useCallback(() => setNfcFor(null), []);

  const data = board.data;
  if (!data) {
    return (
      <>
        <PageHeader title="Tables, QR & Wi-Fi" />
        {board.error ? <LoadError error={board.error} retry={board.refresh} /> : <SkeletonGrid count={8} className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />}
      </>
    );
  }

  const { tables, settings } = data;
  const base = (settings.baseUrl || origin).replace(/\/+$/, "");
  const linkOf = (t: { code: string }) => `${base}/t/${t.code}`;
  const zones = [...new Set(tables.map((t) => t.zone))];
  const printable = tables.filter((t) => t.active);
  const nfcTable = nfcFor ? tables.find((t) => t.id === nfcFor) : undefined;

  const addTable = () =>
    setDraft({
      number: String(Math.max(0, ...tables.map((t) => t.number)) + 1),
      label: "",
      zone: zones[zones.length - 1] ?? "Family Hall",
      seats: "4",
      active: true,
    });

  const copy = async (t: TableView) => {
    const ok = await copyText(linkOf(t));
    toast(ok ? { title: `Link for Table ${t.number} copied` } : { title: "Could not copy the link", tone: "error" });
  };

  const closeBill = async (t: TableView) => {
    if (!t.visit) return;
    const ok = await confirm({
      title: `Close the bill for Table ${t.number}?`,
      text: `${rs(t.openTotal)} in total. The table becomes free and the guests are invited to rate their visit.`,
      confirmLabel: "Close the bill",
    });
    if (ok) await run(`close:${t.id}`, () => rpc("staff.visit.close", { visitId: t.visit!.id }), `Table ${t.number} is free again`);
  };

  const printCards = (list: TableView[]) =>
    print(<PrintCards tables={list} linkOf={linkOf} wifi={settings.wifi} />, { page: "A4" });

  return (
    <>
      <PageHeader
        title="Tables, QR & Wi-Fi"
        subtitle="Every table has its own code. Guests scan it (or tap the NFC tag) to see the Wi-Fi details and order from their seat."
      >
        <a
          href="#wifi"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-ink-900/15 bg-white/60 px-5 text-sm font-semibold text-ink-900 transition hover:bg-white xl:hidden"
        >
          <Wifi className="size-4" /> Wi-Fi details
        </a>
        <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => printCards(printable)} disabled={!printable.length}>
          Print table cards
        </Button>
        <Button variant="gold" icon={<Plus className="size-4" />} onClick={addTable}>
          Add table
        </Button>
      </PageHeader>

      {base && isLocalAddress(base) && (
        <div className="mb-5">
          <Notice title="Phones cannot open these QR codes yet">
            The codes point to <b>{base}</b>, which only works on this computer. Put the system online (for example on Vercel) or
            open this admin panel through your network address, and the codes update by themselves. You can also set the public
            address below.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {tables.length === 0 && (
            <Card>
              <Empty icon={<Armchair className="size-6" />} title="No tables yet" text="Add your first table to get its QR code.">
                <Button variant="gold" icon={<Plus className="size-4" />} onClick={addTable}>
                  Add table
                </Button>
              </Empty>
            </Card>
          )}
          {zones.map((zone) => {
            const list = tables.filter((t) => t.zone === zone);
            return (
              <section key={zone}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="font-display text-xl font-semibold">{zone}</h2>
                  <span className="text-sm text-ink-400">
                    {list.length} {list.length === 1 ? "table" : "tables"} · {list.reduce((a, t) => a + t.seats, 0)} seats
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {list.map((t) => (
                    <Card key={t.id} className={cn("flex flex-col p-4", !t.active && "opacity-60")}>
                      <div className="flex gap-4">
                        <div className="shrink-0 rounded-2xl border border-ink-900/8 bg-white p-1.5">
                          <Qr value={linkOf(t)} size={104} margin={1} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display text-[22px] leading-tight font-semibold">{t.label}</p>
                            <IconButton label={`Edit ${t.label}`} className="-mt-1 -mr-1.5 size-9" onClick={() => setDraft(toDraft(t))}>
                              <Pencil className="size-4 text-ink-400" />
                            </IconButton>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-400">
                            <Armchair className="size-3.5" /> {t.seats} seats
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <Badge tone={STATE_TONE[t.state]} dot>
                              {TABLE_STATE_LABEL[t.state]}
                            </Badge>
                            {!t.active && <Badge>Hidden</Badge>}
                          </div>
                          {t.visit && (
                            <p className="mt-2 truncate text-xs text-ink-500">
                              {t.visit.guestNames.length ? t.visit.guestNames.join(", ") : "Walk-in guests"}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => copy(t)}
                        title="Copy the guest link"
                        className="mt-3.5 flex items-center gap-2 rounded-xl bg-ink-900/[0.04] px-3 py-2 text-left transition hover:bg-ink-900/[0.07]"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-500">{linkOf(t)}</span>
                        <Copy className="size-3.5 shrink-0 text-ink-400" />
                      </button>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <a
                          href={linkOf(t)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3.5 text-[13px] font-semibold text-cream-50 transition hover:bg-ink-800"
                        >
                          <ExternalLink className="size-3.5" /> Open as guest
                        </a>
                        <Button variant="soft" size="sm" icon={<Nfc className="size-3.5" />} onClick={() => setNfcFor(t.id)}>
                          NFC tag
                        </Button>
                        <IconButton label={`Print the card for ${t.label}`} className="size-9" onClick={() => printCards([t])}>
                          <Printer className="size-4 text-ink-500" />
                        </IconButton>
                      </div>

                      {t.visit && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-gold-300/60 bg-gold-50 px-3.5 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gold-800">Open bill</p>
                            <p className="tabular text-sm font-semibold text-ink-900">{rs(t.openTotal)}</p>
                          </div>
                          <Button
                            variant="ink"
                            size="sm"
                            icon={<ReceiptText className="size-3.5" />}
                            loading={busy === `close:${t.id}`}
                            onClick={() => closeBill(t)}
                          >
                            Close bill
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside id="wifi" className="grid min-w-0 scroll-mt-32 grid-cols-1 content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
          <WifiPanel key={JSON.stringify(settings.wifi)} wifi={settings.wifi} />
          <AddressPanel key={settings.baseUrl ?? ""} baseUrl={settings.baseUrl ?? ""} effective={base} />
          {printable[0] && (
            <Panel title="Table card" subtitle="What stands on every table. Prints four to an A4 sheet." className="md:col-span-2 xl:col-span-1">
              <div className="flex justify-center rounded-2xl bg-cream-200/70 py-5">
                {/* The real print layout, shown at 56% size. */}
                <div className="h-[271px] w-[190.5px]">
                  <div className="origin-top-left scale-[0.56]">
                    <CardFace table={printable[0]} link={linkOf(printable[0])} wifi={settings.wifi} />
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </aside>
      </div>

      <TableSheet draft={draft} zones={zones} onChange={setDraft} onClose={closeDraft} tables={tables} />
      {nfcTable && <NfcSheet table={nfcTable} link={linkOf(nfcTable)} onClose={closeNfc} onCopy={() => copy(nfcTable)} />}
    </>
  );
}

const toDraft = (t: TableView): Draft => ({
  id: t.id,
  number: String(t.number),
  label: t.label === `Table ${t.number}` ? "" : t.label,
  zone: t.zone,
  seats: String(t.seats),
  active: t.active,
});

// ───────────────────────────── Add / edit a table ─────────────────────────────

function TableSheet({
  draft,
  zones,
  tables,
  onChange,
  onClose,
}: {
  draft: Draft | null;
  zones: string[];
  tables: TableView[];
  onChange: (d: Draft | null) => void;
  onClose: () => void;
}) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  if (!draft) return null;

  const existing = draft.id ? tables.find((t) => t.id === draft.id) : undefined;
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  const save = async () => {
    const saved = await run(
      "save",
      () =>
        rpc("admin.table.save", {
          id: draft.id,
          number: Number(draft.number),
          label: draft.label.trim() || undefined,
          zone: draft.zone.trim() || undefined,
          seats: Number(draft.seats) || 4,
          active: draft.active,
        }),
      (t) => (draft.id ? `${t.label} updated` : `${t.label} added`),
    );
    if (saved) onClose();
  };

  const rotate = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: `Make a new code for ${existing.label}?`,
      text: "The QR code and NFC tag that are on the table now will stop working straight away. You will need to print a new card and rewrite the tag.",
      confirmLabel: "Make a new code",
      danger: true,
    });
    if (ok) await run("rotate", () => rpc("admin.table.rotate", { id: existing.id }), `${existing.label} has a new code`);
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: `Remove ${existing.label}?`,
      text: "The table and its QR code are deleted. Past orders for this table stay in the reports.",
      confirmLabel: "Remove table",
      danger: true,
    });
    if (!ok) return;
    const res = await run("delete", () => rpc("admin.table.delete", { id: existing.id }), `${existing.label} removed`);
    if (res) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={draft.id ? `Edit ${existing?.label ?? "table"}` : "Add a table"}
      footer={
        <div className="flex gap-3 pb-1">
          <Button variant="outline" block onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" block loading={busy === "save"} onClick={save}>
            {draft.id ? "Save changes" : "Add table"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Table number</Label>
            <Input type="number" inputMode="numeric" min={1} value={draft.number} onChange={(e) => set({ number: e.target.value })} />
          </label>
          <label className="block">
            <Label>Seats</Label>
            <Input type="number" inputMode="numeric" min={1} value={draft.seats} onChange={(e) => set({ seats: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <Label hint="Optional">Name shown to staff</Label>
          <Input value={draft.label} placeholder={`Table ${draft.number || ""}`.trim()} onChange={(e) => set({ label: e.target.value })} />
        </label>
        <label className="block">
          <Label>Area</Label>
          <Input value={draft.zone} list="zr-zones" placeholder="Family Hall" onChange={(e) => set({ zone: e.target.value })} />
          <datalist id="zr-zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </label>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink-900/[0.04] px-4 py-3">
          <div>
            <p className="text-sm font-semibold">In service</p>
            <p className="text-xs text-ink-400">Switch off to hide the table; its code stops accepting orders.</p>
          </div>
          <Toggle checked={draft.active} onChange={(v) => set({ active: v })} label="In service" />
        </div>

        {existing && (
          <div className="rounded-2xl border border-ink-900/10 p-4">
            <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Code and removal</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<RefreshCw className="size-3.5" />} loading={busy === "rotate"} onClick={rotate}>
                New QR / NFC code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-ruby-600 hover:bg-ruby-50"
                icon={<Trash2 className="size-3.5" />}
                loading={busy === "delete"}
                onClick={remove}
              >
                Remove table
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ───────────────────────────── NFC ─────────────────────────────

interface NdefWriter {
  write(message: { records: { recordType: string; data: string }[] }, options?: { signal?: AbortSignal }): Promise<void>;
}
const ndefReader = () =>
  typeof window === "undefined" ? undefined : (window as unknown as { NDEFReader?: new () => NdefWriter }).NDEFReader;

function NfcSheet({
  table,
  link,
  onClose,
  onCopy,
}: {
  table: TableView;
  link: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "writing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  const Reader = ndefReader();

  useEffect(() => () => abort.current?.abort(), []);

  const write = async () => {
    if (!Reader) return;
    abort.current?.abort();
    const control = new AbortController();
    abort.current = control;
    setPhase("writing");
    try {
      await new Reader().write({ records: [{ recordType: "url", data: link }] }, { signal: control.signal });
      setPhase("done");
    } catch (e) {
      if (control.signal.aborted) return;
      setMessage(errorMessage(e));
      setPhase("error");
    }
  };

  return (
    <Sheet open onClose={onClose} title={`NFC tag for ${table.label}`}>
      <div className="flex flex-col items-center pt-2 text-center">
        <div
          className={cn(
            "flex size-20 items-center justify-center rounded-full",
            phase === "done" ? "bg-leaf-100 text-leaf-600" : "bg-gold-100 text-gold-700",
            phase === "writing" && "animate-ring",
          )}
        >
          {phase === "done" ? <CircleCheck className="size-9" /> : <SmartphoneNfc className="size-9" />}
        </div>

        {Reader ? (
          <>
            <p className="font-display mt-5 text-xl font-semibold">
              {phase === "writing" ? "Hold the tag to the back of this phone" : phase === "done" ? "Tag written" : "Write this table's link to a tag"}
            </p>
            <p className="mt-2 max-w-xs text-sm text-ink-500">
              {phase === "writing"
                ? "Keep it there for a moment until the phone confirms."
                : phase === "done"
                  ? `Stick it on ${table.label}. Guests who tap it land on the menu for this table, with the Wi-Fi details.`
                  : phase === "error"
                    ? message
                    : "Any blank NTAG sticker works. Guests tap it with their phone instead of scanning the QR code."}
            </p>
            <Button variant="gold" size="lg" className="mt-6" loading={phase === "writing"} onClick={write} icon={<Nfc className="size-4" />}>
              {phase === "done" ? "Write another tag" : phase === "error" ? "Try again" : "Start writing"}
            </Button>
          </>
        ) : (
          <>
            <p className="font-display mt-5 text-xl font-semibold">Open this page on an Android phone</p>
            <p className="mt-2 max-w-xs text-sm text-ink-500">
              Tags are written with Chrome on an Android phone that has NFC, over a secure (https) address. Open the admin panel
              there and press this button again, or write the link below with any NFC app.
            </p>
          </>
        )}

        <button
          onClick={onCopy}
          className="mt-6 flex w-full items-center gap-2 rounded-xl bg-ink-900/[0.04] px-3.5 py-3 text-left transition hover:bg-ink-900/[0.07]"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-600">{link}</span>
          <Copy className="size-4 shrink-0 text-ink-400" />
        </button>
      </div>
    </Sheet>
  );
}

// ───────────────────────────── Wi-Fi & address ─────────────────────────────

function WifiPanel({ wifi }: { wifi: WifiSettings }) {
  const { run, busy } = useAction();
  const [form, setForm] = useState(wifi);
  const [reveal, setReveal] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(wifi);
  const open = form.security === "nopass";

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Wifi className="size-[18px] text-gold-600" /> Guest Wi-Fi
        </span>
      }
      subtitle="Shown on the guest's phone the moment they scan their table."
      action={<Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Show Wi-Fi to guests" />}
    >
      <div className={cn("space-y-3.5", !form.enabled && "opacity-50")}>
        <label className="block">
          <Label>Network name</Label>
          <Input value={form.ssid} maxLength={32} onChange={(e) => setForm({ ...form, ssid: e.target.value })} />
        </label>
        <div>
          <Label>Security</Label>
          <Segmented
            className="w-full [&>button]:flex-1"
            value={form.security}
            onChange={(security) => setForm({ ...form, security })}
            options={[
              { value: "WPA", label: "WPA2" },
              { value: "WEP", label: "WEP" },
              { value: "nopass", label: "Open" },
            ]}
          />
        </div>
        {!open && (
          <label className="block">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={reveal ? "text" : "password"}
                value={form.password}
                maxLength={63}
                autoComplete="off"
                className="pr-11"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                aria-label={reveal ? "Hide password" : "Show password"}
                onClick={() => setReveal((r) => !r)}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-900/5"
              >
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
        )}

        <div className="flex items-center gap-4 rounded-2xl bg-ink-900/[0.04] p-3">
          <div className="shrink-0 rounded-xl bg-white p-1.5">
            <Qr value={wifiQr(form.ssid, form.password, form.security)} size={84} margin={1} />
          </div>
          <p className="text-xs leading-relaxed text-ink-500">
            <b className="text-ink-900">Join code.</b> Phones connect to the Wi-Fi by scanning this, with no typing. It is printed
            on every table card.
          </p>
        </div>
      </div>
      <Button
        variant="ink"
        block
        className="mt-4"
        disabled={!dirty}
        loading={busy === "wifi"}
        onClick={() => run("wifi", () => rpc("admin.settings.save", { patch: { wifi: form } }), "Wi-Fi details updated for every table")}
      >
        Save Wi-Fi details
      </Button>
    </Panel>
  );
}

function AddressPanel({ baseUrl, effective }: { baseUrl: string; effective: string }) {
  const { run, busy } = useAction();
  const [value, setValue] = useState(baseUrl);
  const dirty = value.trim().replace(/\/+$/, "") !== baseUrl;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Globe className="size-[18px] text-gold-600" /> Public address
        </span>
      }
      subtitle="The address written into every QR code and NFC tag."
    >
      <label className="block">
        <Label hint="Optional">Your own address</Label>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://order.zaitoonfamilyrestaurant.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <p className="mt-2.5 text-xs leading-relaxed text-ink-400">
        Leave it empty to use the address this panel is open on. Codes currently point to{" "}
        <b className="break-all text-ink-700">{effective || "this site"}</b>.
      </p>
      <Button
        variant="ink"
        block
        className="mt-4"
        disabled={!dirty}
        loading={busy === "base"}
        onClick={() => run("base", () => rpc("admin.settings.save", { patch: { baseUrl: value.trim() } }), "Public address saved: all codes updated")}
      >
        Save address
      </Button>
    </Panel>
  );
}

// ───────────────────────────── Printable table cards ─────────────────────────────

/** One table card, 90 × 128 mm. Used for printing and for the on-screen preview. */
function CardFace({ table, link, wifi }: { table: TableView; link: string; wifi: WifiSettings }) {
  return (
    <div
      style={{ width: "90mm", height: "128mm" }}
      className="flex flex-col items-center overflow-hidden rounded-[5mm] border-[0.5mm] border-gold-500 bg-white px-[7mm] pt-[6mm] pb-[5mm] text-center font-sans text-ink-900"
    >
      <img src="/brand/zaitoon-wordmark.png" alt="Zaitoon" style={{ height: "12mm", width: "auto" }} />
      <p className="mt-[1mm] text-[6.5pt] font-semibold tracking-[0.32em] text-ink-500 uppercase">Family Restaurant</p>

      <p className="font-display mt-[4.5mm] text-[19pt] leading-none font-semibold">Scan to order</p>
      <p className="mt-[1.8mm] text-[7.5pt] leading-tight text-ink-500">Point your camera at the code. No app needed.</p>

      <div className="mt-[3.5mm] rounded-[3mm] border-[0.3mm] border-ink-900/15 p-[1.5mm]">
        <Qr value={link} margin={1} className="h-[38mm] w-[38mm]" />
      </div>

      <p className="mt-[3mm] text-[6.5pt] font-semibold tracking-[0.32em] text-ink-400 uppercase">Table</p>
      <p className="font-display text-[28pt] leading-none font-semibold">{table.number}</p>

      <div className="mt-auto flex w-full items-center gap-[3mm] border-t-[0.3mm] border-gold-500/50 pt-[3mm] text-left">
        {wifi.enabled && <Qr value={wifiQr(wifi.ssid, wifi.password, wifi.security)} margin={0} className="h-[16mm] w-[16mm] shrink-0" />}
        <div className="min-w-0 text-[7pt] leading-snug">
          {wifi.enabled && (
            <>
              <p className="font-bold">Free Wi-Fi: {wifi.ssid}</p>
              <p className="text-ink-500">
                Scan the small code to join{wifi.security !== "nopass" && wifi.password ? `, or use password ${wifi.password}` : ""}.
              </p>
            </>
          )}
          <p className={cn("flex items-center gap-[1mm] text-ink-500", wifi.enabled && "mt-[1mm]")}>
            <Nfc className="size-[3mm] shrink-0" /> Or tap your phone here (NFC).
          </p>
        </div>
      </div>
    </div>
  );
}

function PrintCards({
  tables,
  linkOf,
  wifi,
}: {
  tables: TableView[];
  linkOf: (t: TableView) => string;
  wifi: WifiSettings;
}) {
  const pages: TableView[][] = [];
  for (let i = 0; i < tables.length; i += 4) pages.push(tables.slice(i, i + 4));
  return (
    <div>
      {pages.map((group, i) => (
        <div
          key={i}
          style={{ width: "210mm", height: "296mm" }}
          className={cn(
            "grid grid-cols-[90mm_90mm] content-center justify-center gap-[8mm] bg-white",
            i < pages.length - 1 && "print-break",
          )}
        >
          {group.map((t) => (
            <CardFace key={t.id} table={t} link={linkOf(t)} wifi={wifi} />
          ))}
        </div>
      ))}
    </div>
  );
}
