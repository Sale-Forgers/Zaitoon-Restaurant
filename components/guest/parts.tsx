"use client";

import {
  Bell,
  BellOff,
  BellRing,
  Check,
  ChefHat,
  ClipboardCheck,
  ConciergeBell,
  Copy,
  GlassWater,
  HandPlatter,
  MessageCircle,
  QrCode,
  ReceiptText,
  Share,
  SquarePlus,
  Utensils,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Qr } from "@/components/Qr";
import { Button, Sheet, Textarea, useToast } from "@/components/ui";
import { enablePush, getPushState, type PushState } from "@/lib/client/push";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { CALL_LABEL, clock, cn, STATUS_GUEST, wifiQr } from "@/lib/format";
import { ORDER_FLOW, type CallType, type GuestSettings, type Order, type OrderStatus } from "@/lib/types";

// ───────────────────────────── Wi-Fi ─────────────────────────────

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  // Fallback for plain-http addresses on the local network.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  el.remove();
  return ok;
}

export function WifiCard({ wifi, dark }: { wifi: GuestSettings["wifi"]; dark?: boolean }) {
  const toast = useToast();
  const [showQr, setShowQr] = useState(false);
  if (!wifi.enabled || !wifi.ssid) return null;
  const open = wifi.security === "nopass" || !wifi.password;

  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        dark ? "border-white/10 bg-white/[0.05] text-sand-50" : "border-ink-900/8 bg-white text-ink-900 shadow-soft",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="bg-gold-sheen flex size-11 shrink-0 items-center justify-center rounded-2xl text-ink-900">
          <Wifi className="size-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold tracking-widest uppercase", dark ? "text-gold-300" : "text-gold-700")}>
            Free guest Wi-Fi
          </p>
          <p className="truncate text-[15px] font-semibold">{wifi.ssid}</p>
        </div>
        <button
          onClick={() => setShowQr((v) => !v)}
          aria-label="Show Wi-Fi QR code"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full transition",
            dark ? "bg-white/8 hover:bg-white/15" : "bg-ink-900/5 hover:bg-ink-900/10",
          )}
        >
          <QrCode className="size-5" />
        </button>
      </div>

      {!open && (
        <div
          className={cn(
            "mt-3 flex items-center justify-between gap-3 rounded-2xl py-2 pr-2 pl-4",
            dark ? "bg-black/30" : "bg-cream-200",
          )}
        >
          <div className="min-w-0">
            <p className={cn("text-[11px]", dark ? "text-sand-400" : "text-ink-400")}>Password</p>
            <p className="truncate font-mono text-base font-semibold tracking-wide select-all">{wifi.password}</p>
          </div>
          <Button
            size="sm"
            variant={dark ? "gold" : "ink"}
            icon={<Copy className="size-3.5" />}
            onClick={async () => {
              const ok = await copyText(wifi.password);
              toast(
                ok
                  ? { title: "Password copied", text: `Join “${wifi.ssid}” in your Wi-Fi settings and paste it.` }
                  : { title: "Could not copy", text: "Press and hold the password to copy it.", tone: "error" },
              );
            }}
          >
            Copy
          </Button>
        </div>
      )}
      {open && <p className={cn("mt-3 text-sm", dark ? "text-sand-400" : "text-ink-400")}>Open network, no password needed.</p>}

      {showQr && (
        <div className="animate-fade mt-4 flex items-center gap-4">
          <div className="rounded-2xl bg-white p-2">
            <Qr value={wifiQr(wifi.ssid, wifi.password, wifi.security)} size={104} margin={1} />
          </div>
          <p className={cn("text-[13px] leading-snug", dark ? "text-sand-300" : "text-ink-500")}>
            Friends at your table can point their camera at this code to join the Wi-Fi straight away.
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Notifications ─────────────────────────────

export function usePush() {
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushState().then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      setState(next);
      if (next === "enabled") {
        toast({ title: "Notifications are on", text: "We will let you know the moment your food is ready." });
      } else if (next === "denied") {
        toast({
          title: "Notifications are blocked",
          text: "Allow them for this site in your browser settings to get order updates.",
          tone: "error",
        });
      }
      return next;
    } catch (e) {
      toast({ title: "Could not turn on notifications", text: errorMessage(e), tone: "error" });
      return state;
    } finally {
      setBusy(false);
    }
  }, [toast, state]);

  return { state, busy, enable };
}

export function IosInstallSteps({ dark }: { dark?: boolean }) {
  const row = cn("flex items-center gap-3 text-sm", dark ? "text-sand-200" : "text-ink-600");
  const chip = cn(
    "flex size-8 shrink-0 items-center justify-center rounded-xl",
    dark ? "bg-white/10 text-gold-300" : "bg-ink-900/6 text-ink-700",
  );
  return (
    <div className="space-y-2.5">
      <p className={row}>
        <span className={chip}>
          <Share className="size-4" />
        </span>
        Tap the Share button in Safari
      </p>
      <p className={row}>
        <span className={chip}>
          <SquarePlus className="size-4" />
        </span>
        Choose “Add to Home Screen”
      </p>
      <p className={row}>
        <span className={chip}>
          <Bell className="size-4" />
        </span>
        Open Zaitoon from your Home Screen and turn on notifications
      </p>
    </div>
  );
}

/** Compact card inviting the guest to turn on order notifications. */
export function PushCard() {
  const { state, busy, enable } = usePush();
  if (!state || state === "unsupported" || state === "insecure") return null;

  if (state === "enabled") {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-leaf-500/20 bg-leaf-50 px-4 py-3 text-leaf-700">
        <BellRing className="size-5 shrink-0" />
        <p className="text-sm font-medium">Notifications are on. We will tell you when your food is ready.</p>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-ink-900/8 bg-white px-4 py-3 text-ink-500 shadow-soft">
        <BellOff className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm">
          Notifications are blocked for this site. Allow them in your browser settings to get live order updates.
        </p>
      </div>
    );
  }
  if (state === "ios-install") {
    return (
      <div className="rounded-3xl border border-ink-900/8 bg-white p-4 shadow-soft">
        <p className="font-display text-lg font-semibold">Get order updates on your iPhone</p>
        <p className="mt-1 mb-3 text-sm text-ink-400">Apple shows notifications only for sites saved to the Home Screen.</p>
        <IosInstallSteps />
      </div>
    );
  }
  return (
    <div className="bg-ink-sheen flex items-center gap-4 rounded-3xl p-4 text-sand-50 shadow-lift">
      <div className="bg-gold-sheen animate-ring flex size-12 shrink-0 items-center justify-center rounded-2xl text-ink-900">
        <BellRing className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] leading-tight font-semibold">Know the moment it is ready</p>
        <p className="mt-0.5 text-[13px] text-sand-400">Live updates on your order. No app needed.</p>
      </div>
      <Button variant="gold" size="sm" loading={busy} onClick={enable}>
        Turn on
      </Button>
    </div>
  );
}

// ───────────────────────────── Order tracker ─────────────────────────────

const STEP_ICON: Record<OrderStatus, ReactNode> = {
  received: <ClipboardCheck className="size-[18px]" />,
  preparing: <ChefHat className="size-[18px]" />,
  ready: <ConciergeBell className="size-[18px]" />,
  picked_up: <HandPlatter className="size-[18px]" />,
  served: <Utensils className="size-[18px]" />,
  cancelled: <UtensilsCrossed className="size-[18px]" />,
};

const STEP_SHORT: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "On its way",
  served: "Served",
  cancelled: "Cancelled",
};

export function Tracker({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-ruby-50 px-4 py-3 text-ruby-700">
        <UtensilsCrossed className="size-5" />
        <div>
          <p className="text-sm font-semibold">{STATUS_GUEST.cancelled.title}</p>
          <p className="text-[13px] opacity-80">Please speak to your waiter if this was not expected.</p>
        </div>
      </div>
    );
  }
  const idx = ORDER_FLOW.indexOf(order.status);
  const progress = (idx / (ORDER_FLOW.length - 1)) * 100;
  const done = order.status === "served";

  return (
    <div>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            done ? "bg-leaf-500 text-white" : "bg-gold-sheen animate-ring text-ink-900",
          )}
        >
          {done ? <Check className="size-6" strokeWidth={3} /> : STEP_ICON[order.status]}
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight font-semibold">{STATUS_GUEST[order.status].title}</p>
          <p className="mt-0.5 text-sm text-ink-400">{STATUS_GUEST[order.status].text}</p>
        </div>
      </div>

      <div className="relative mt-5 px-[18px]">
        <div className="absolute top-[17px] right-[18px] left-[18px] h-1 rounded-full bg-ink-900/8" />
        <div
          className={cn("absolute top-[17px] left-[18px] h-1 rounded-full transition-all duration-700", done ? "bg-leaf-500" : "bg-gold-400")}
          style={{ width: `calc((100% - 36px) * ${progress / 100})` }}
        />
      </div>
      <ol className="relative flex justify-between">
        {ORDER_FLOW.map((step, i) => {
          const reached = i <= idx;
          const current = i === idx && !done;
          const at = order.times[step];
          return (
            <li key={step} className="flex w-9 flex-col items-center">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 transition",
                  reached
                    ? done
                      ? "border-leaf-500 bg-leaf-500 text-white"
                      : "border-gold-400 bg-gold-400 text-ink-900"
                    : "border-ink-900/10 bg-cream-50 text-ink-300",
                  current && "ring-4 ring-gold-200",
                )}
              >
                {STEP_ICON[step]}
              </span>
              <span
                className={cn(
                  "mt-1.5 w-16 text-center text-[10.5px] leading-tight font-semibold",
                  reached ? "text-ink-800" : "text-ink-300",
                )}
              >
                {STEP_SHORT[step]}
              </span>
              <span className="tabular mt-0.5 w-16 text-center text-[10px] whitespace-nowrap text-ink-300">
                {at ? clock(at) : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ───────────────────────────── Call waiter ─────────────────────────────

const CALL_OPTIONS: { type: CallType; icon: ReactNode; hint: string }[] = [
  { type: "waiter", icon: <ConciergeBell className="size-6" />, hint: "Someone will come to your table" },
  { type: "water", icon: <GlassWater className="size-6" />, hint: "Fresh water for the table" },
  { type: "cutlery", icon: <Utensils className="size-6" />, hint: "Extra plates, spoons or tissues" },
  { type: "bill", icon: <ReceiptText className="size-6" />, hint: "We will bring your bill" },
];

export function CallSheet({
  open,
  onClose,
  code,
  tableNumber,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  tableNumber: number;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<CallType | null>(null);
  const [other, setOther] = useState(false);
  const [note, setNote] = useState("");

  const send = async (type: CallType, text?: string) => {
    setBusy(type);
    try {
      await rpc("guest.call", { code, type, note: text });
      toast({
        title: type === "bill" ? "Bill requested" : "Your waiter has been notified",
        text: `Table ${tableNumber}: someone will be with you shortly.`,
      });
      setOther(false);
      setNote("");
      onClose();
    } catch (e) {
      toast({ title: "Could not send your request", text: errorMessage(e), tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="How can we help?">
      <p className="-mt-1 mb-4 text-sm text-ink-400">Your request goes straight to the waiters looking after Table {tableNumber}.</p>
      <div className="grid grid-cols-2 gap-3">
        {CALL_OPTIONS.map((o) => (
          <button
            key={o.type}
            disabled={busy !== null}
            onClick={() => send(o.type)}
            className={cn(
              "flex flex-col items-start gap-3 rounded-3xl border border-ink-900/8 bg-white p-4 text-left shadow-soft transition active:scale-[0.98]",
              busy === o.type && "opacity-60",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-ink-900 text-gold-300">{o.icon}</span>
            <span>
              <span className="block text-[15px] font-semibold">{CALL_LABEL[o.type]}</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-400">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {other ? (
        <div className="animate-fade mt-4">
          <Textarea
            autoFocus
            maxLength={140}
            placeholder="Tell us what you need"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            block
            size="lg"
            className="mt-3"
            loading={busy === "other"}
            disabled={note.trim().length < 2}
            onClick={() => send("other", note)}
          >
            Send to waiter
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setOther(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-ink-500 hover:bg-ink-900/5"
        >
          <MessageCircle className="size-4" /> Something else
        </button>
      )}
    </Sheet>
  );
}
