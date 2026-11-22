import { ArrowRight, BellRing, Check, Nfc, Plus, Printer, QrCode, Star, Wifi } from "lucide-react";
import { cn } from "@/lib/format";
import type { JourneyStep } from "@/lib/pitch";

/**
 * Hand-built illustrations of the real screens, drawn in JSX so they stay sharp
 * at any size. Dish names and prices are from Zaitoon's own menu.
 */

// ───────────────────────────── Kitchen display on a monitor ─────────────────────────────

type Stage = "received" | "preparing" | "ready";

const STAGE: Record<Stage, { label: string; dot: string; text: string; action: string }> = {
  received: { label: "Received", dot: "bg-sky-400", text: "text-sky-400", action: "Start preparing" },
  preparing: { label: "Preparing", dot: "bg-gold-400", text: "text-gold-300", action: "Mark ready" },
  ready: { label: "Ready", dot: "bg-leaf-400", text: "text-leaf-400", action: "Picked up" },
};

interface MiniTicket {
  table: number;
  number: number;
  timer: string;
  source: string;
  lines: [qty: number, name: string, option?: string][];
}

const BOARD: Record<Stage, MiniTicket[]> = {
  received: [
    {
      table: 7,
      number: 214,
      timer: "00:42",
      source: "QR order",
      lines: [
        [1, "Karahi Chicken", "Full · Medium"],
        [2, "Garlic Naan"],
        [2, "Mint Margarita"],
      ],
    },
  ],
  preparing: [
    {
      table: 3,
      number: 212,
      timer: "06:18",
      source: "Waiter · Ali",
      lines: [
        [1, "Szechuan", "Chicken"],
        [1, "Chicken Chow Mein"],
      ],
    },
    {
      table: 12,
      number: 213,
      timer: "03:05",
      source: "QR order",
      lines: [
        [2, "Smokehouse Beef Burger"],
        [1, "Loaded Fries"],
      ],
    },
  ],
  ready: [
    {
      table: 5,
      number: 211,
      timer: "14:27",
      source: "QR order",
      lines: [
        [1, "Beef Steak", "Mushroom"],
        [1, "Stuffed Chicken and Cheese"],
      ],
    },
  ],
};

function Ticket({ t, stage }: { t: MiniTicket; stage: Stage }) {
  const s = STAGE[stage];
  return (
    <div className="rounded-lg border border-white/8 bg-ink-800 p-2">
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-display text-[17px] leading-none font-semibold text-sand-50">T{t.table}</span>
        <span className={cn("tabular text-[10px] font-bold", s.text)}>{t.timer}</span>
      </div>
      <p className="mt-0.5 text-[8.5px] text-sand-500">
        #{t.number} · {t.source}
      </p>
      <div className="mt-1.5 space-y-1">
        {t.lines.map(([qty, name, option]) => (
          <div key={name} className="text-[10px] leading-tight text-sand-100">
            <span className="font-bold text-gold-300">{qty}×</span> {name}
            {option && <span className="block pl-3.5 text-[8.5px] text-sand-500">{option}</span>}
          </div>
        ))}
      </div>
      <div className={cn("mt-2 rounded-md border border-current/30 py-1 text-center text-[8.5px] font-bold", s.text)}>
        {s.action}
      </div>
    </div>
  );
}

export function MonitorVignette() {
  return (
    <div>
      <div className="rounded-[20px] border border-white/12 bg-ink-800 p-2.5 shadow-lift">
        <div className="overflow-hidden rounded-[12px] bg-ink-950">
          <div className="flex h-9 items-center gap-2 border-b border-white/8 px-3">
            <img src="/icons/icon-192.png" alt="" width={20} height={20} className="size-5 rounded-md" />
            <span className="text-[11px] font-semibold text-sand-50">Kitchen Display</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-leaf-500/15 px-2 py-0.5 text-[8.5px] font-bold text-leaf-400">
              <span className="size-1.5 rounded-full bg-leaf-400" />
              Live
            </span>
            <span className="tabular text-[10px] font-semibold text-sand-300">8:42 PM</span>
          </div>
          <div className="grid h-[292px] grid-cols-3 gap-2 p-2.5">
            {(Object.keys(BOARD) as Stage[]).map((stage) => (
              <div key={stage} className="rounded-xl bg-white/[0.03] p-1.5">
                <div className="mb-1.5 flex items-center gap-1.5 px-1 pt-0.5">
                  <span className={cn("size-1.5 rounded-full", STAGE[stage].dot)} />
                  <span className="text-[9px] font-bold tracking-wider text-sand-300 uppercase">
                    {STAGE[stage].label}
                  </span>
                  <span className="ml-auto rounded-full bg-white/8 px-1.5 text-[8.5px] font-bold text-sand-300">
                    {BOARD[stage].length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {BOARD[stage].map((t) => (
                    <Ticket key={t.number} t={t} stage={stage} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto h-9 w-24 bg-gradient-to-b from-ink-700 to-ink-800" />
      <div className="mx-auto h-2.5 w-48 rounded-full bg-ink-700 shadow-lift" />
    </div>
  );
}

// ───────────────────────────── Guest menu on a phone ─────────────────────────────

const PHONE_DISHES: { name: string; text: string; price: string; image: string; qty?: number }[] = [
  {
    name: "Karahi Chicken",
    text: "Aromatic herbs, chef's secret spices",
    price: "from Rs 1,300",
    image: "karahi-chicken",
    qty: 1,
  },
  { name: "Szechuan", text: "Spicy, with bell peppers and chillies", price: "from Rs 1,450", image: "szechuan" },
  {
    name: "Smokehouse Beef Burger",
    text: "BBQ sauce, cheddar, pickles",
    price: "Rs 750",
    image: "smokehouse-burger",
  },
];

export function PhoneVignette() {
  return (
    <div className="rounded-[34px] border border-white/15 bg-ink-800 p-[7px] shadow-lift">
      <div className="overflow-hidden rounded-[27px] bg-cream-100">
        <div className="bg-ink-900 px-3.5 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <img
              src="/brand/zaitoon-wordmark.png"
              alt=""
              width={900}
              height={357}
              className="h-6 w-auto"
            />
            <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold text-gold-200">Table 7</span>
          </div>
          <p className="font-display mt-2.5 text-[15px] leading-tight text-sand-50">Good evening, Ahmed</p>
          <p className="text-[9.5px] text-sand-400">What would you like today?</p>
        </div>

        <div className="flex gap-1.5 overflow-hidden px-3 pt-2.5">
          {["Popular", "Karahi & Handi", "Burgers"].map((c, i) => (
            <span
              key={c}
              className={cn(
                "rounded-full px-2.5 py-1 text-[9px] font-semibold whitespace-nowrap",
                i === 0 ? "bg-ink-900 text-cream-50" : "bg-ink-900/6 text-ink-500",
              )}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="space-y-2 px-3 pt-2.5 pb-3">
          {PHONE_DISHES.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5 rounded-2xl bg-white p-2 shadow-soft">
              <img
                src={`/images/dishes/${d.image}-sm.webp`}
                alt=""
                width={320}
                height={320}
                loading="lazy"
                className="size-12 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-ink-900">{d.name}</p>
                <p className="truncate text-[8.5px] text-ink-400">{d.text}</p>
                <p className="mt-0.5 text-[10px] font-bold text-ink-900">{d.price}</p>
              </div>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  d.qty ? "bg-gold-sheen text-ink-900" : "bg-ink-900 text-gold-300",
                )}
              >
                {d.qty ?? <Plus className="size-3" strokeWidth={3} />}
              </span>
            </div>
          ))}
        </div>

        <div className="px-3 pb-3.5">
          <div className="bg-gold-sheen flex items-center justify-between rounded-full px-3.5 py-2.5 text-ink-900 shadow-gold">
            <span className="text-[10px] font-bold">5 items</span>
            <span className="text-[10.5px] font-extrabold">View order</span>
            <span className="text-[10px] font-bold">Rs 3,100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Kitchen order ticket ─────────────────────────────

const TEETH = 14;
const ZIGZAG = `polygon(0 0, 100% 0, 100% calc(100% - 7px), ${Array.from({ length: TEETH * 2 + 1 }, (_, i) => {
  const x = 100 - (i * 100) / (TEETH * 2);
  return `${x.toFixed(2)}% ${i % 2 ? "100%" : "calc(100% - 7px)"}`;
}).join(", ")}, 0 calc(100% - 7px))`;

export function KotVignette({ className }: { className?: string }) {
  return (
    // The shadow sits on a wrapper: a filter on the clipped element itself would be cut off.
    <div className={className} style={{ filter: "drop-shadow(0 14px 22px rgb(0 0 0 / 0.45))" }}>
      <KotPaper />
    </div>
  );
}

function KotPaper() {
  return (
    <div
      className="w-[158px] bg-white px-3 pt-3 pb-5 font-mono text-[9px] leading-[1.45] text-black"
      style={{ clipPath: ZIGZAG }}
    >
      <p className="text-center text-[8px] font-bold tracking-[0.14em]">KITCHEN ORDER TICKET</p>
      <div className="my-1.5 border-t border-dashed border-black/60" />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[7.5px]">TABLE</p>
          <p className="text-[26px] leading-none font-extrabold">7</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-extrabold">#214</p>
          <p className="text-[8px]">8:42 PM</p>
        </div>
      </div>
      <div className="my-1.5 border-t border-dashed border-black/60" />
      <p className="font-bold">1 x Karahi Chicken</p>
      <p className="pl-2.5 text-[8px]">Full · Medium</p>
      <p className="font-bold">2 x Garlic Naan</p>
      <p className="font-bold">2 x Mint Margarita</p>
      <div className="my-1.5 border-t border-dashed border-black/60" />
      <p className="text-[8px]">QR order · Items: 5</p>
    </div>
  );
}

// ───────────────────────────── Push notification ─────────────────────────────

export function PushToast({
  title = "Your order is ready",
  body = "Order #214 is ready in the kitchen. Your waiter is collecting it now.",
  time = "now",
  className,
}: {
  title?: string;
  body?: string;
  time?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[20px] border border-white/60 bg-white/92 p-3 text-ink-900 shadow-lift backdrop-blur",
        className,
      )}
    >
      <img src="/icons/icon-192.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-semibold tracking-wide text-ink-400 uppercase">Zaitoon</span>
          <span className="text-[10px] text-ink-300">{time}</span>
        </div>
        <p className="text-[13px] leading-snug font-bold">{title}</p>
        <p className="text-[11.5px] leading-snug text-ink-500">{body}</p>
      </div>
    </div>
  );
}

/** A lock screen with the order updates a guest receives, newest first. */
export function LockScreenVignette() {
  return (
    <div
      role="img"
      aria-label="A phone lock screen showing three order notifications from Zaitoon"
      className="relative mx-auto w-full max-w-[400px] overflow-hidden rounded-[40px] border border-ink-900/10 bg-ink-900 p-5 pt-9 shadow-lift"
    >
      <img
        src="/images/venue/rooftop-night.webp"
        alt=""
        width={1600}
        height={1203}
        loading="lazy"
        className="absolute inset-0 size-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/35 to-ink-950/85" />
      <div className="relative">
        <p className="font-display text-center text-6xl leading-none font-medium text-sand-50">8:54</p>
        <p className="mt-1.5 text-center text-xs font-medium tracking-wide text-sand-200">Table 7 · Family Hall</p>
        <div className="mt-8 space-y-2.5">
          <PushToast title="On its way to your table" body="Ali is bringing order #214 to Table 7." />
          <PushToast time="2 min ago" className="opacity-95" />
          <PushToast
            title="Your order is being prepared"
            body="Order #214 for Table 7: our chefs have started cooking."
            time="14 min ago"
            className="opacity-85"
          />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Hero composition ─────────────────────────────

export function HeroDevices() {
  return (
    <div
      role="img"
      aria-label="Illustration of the kitchen display, the guest's phone menu, a printed kitchen ticket and an order notification"
      className="relative mx-auto h-[606px] w-[660px] [zoom:0.48] min-[420px]:[zoom:0.57] min-[520px]:[zoom:0.72] sm:[zoom:0.85] md:[zoom:1] lg:[zoom:0.66] xl:[zoom:0.86]"
    >
      <div className="absolute top-[70px] left-0 w-[540px]">
        <MonitorVignette />
      </div>
      <div className="absolute bottom-4 left-5 z-20 -rotate-[5deg]">
        <KotVignette />
      </div>
      <div className="absolute right-0 bottom-0 z-30 w-[236px]">
        <PhoneVignette />
      </div>
      <div className="animate-nudge absolute top-0 right-0 z-40 w-[312px] [animation-duration:5s]">
        <PushToast />
      </div>
    </div>
  );
}

// ───────────────────────────── Journey step vignettes ─────────────────────────────

const STAGES = ["Received", "Preparing", "Ready", "On its way", "Served"];

export function StepVignette({ id }: { id: JourneyStep["id"] }) {
  return (
    <div className="flex h-36 items-center justify-center rounded-2xl border border-white/6 bg-ink-950/70 p-4">
      {id === "scan" && (
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-cream-50 px-3 pt-2.5 pb-2 text-center text-ink-900 shadow-lift">
            <QrCode className="mx-auto size-14" strokeWidth={1.4} />
            <p className="mt-1 text-[9px] font-bold tracking-wider uppercase">Table 7</p>
            <p className="text-[8px] text-ink-400">Scan to order</p>
          </div>
          <span className="text-[10px] font-semibold text-sand-500">or</span>
          <div className="flex size-14 items-center justify-center rounded-full border border-gold-400/50 text-gold-300 [--ring-color:rgb(220_180_75/0.35)] animate-ring">
            <Nfc className="size-7" strokeWidth={1.5} />
          </div>
        </div>
      )}

      {id === "wifi" && (
        <div className="w-full max-w-[220px] rounded-2xl bg-white/[0.06] p-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-gold-sheen flex size-9 items-center justify-center rounded-xl text-ink-900">
              <Wifi className="size-5" />
            </span>
            <div>
              <p className="text-[10px] text-sand-500">Guest Wi-Fi</p>
              <p className="text-sm font-bold text-sand-50">Zaitoon Guest</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-ink-950/70 px-3 py-2">
            <span className="font-mono text-xs tracking-[0.25em] text-sand-200">••••••••</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gold-200">Copy</span>
          </div>
        </div>
      )}

      {id === "name" && (
        <div className="w-full max-w-[220px]">
          <p className="mb-1.5 text-[10px] font-semibold text-sand-500">What should we call you?</p>
          <div className="flex items-center rounded-xl border border-gold-400/60 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-sand-50">
            Ahmed
            <span className="ml-0.5 h-4 w-px animate-pulse bg-gold-300" />
          </div>
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-leaf-500/15 px-2.5 py-1 text-[10px] font-semibold text-leaf-400">
            <Check className="size-3" strokeWidth={3} /> Next visit: Welcome back, Ahmed
          </p>
        </div>
      )}

      {id === "order" && (
        <div className="flex w-full max-w-[240px] flex-col items-center gap-2.5">
          <div className="bg-gold-sheen flex w-full items-center justify-between rounded-full px-4 py-2.5 text-[11px] font-bold text-ink-900">
            <span>5 items</span>
            <span>Place order</span>
            <span>Rs 3,100</span>
          </div>
          <ArrowRight className="size-4 rotate-90 text-sand-500" />
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-mono text-[10px] font-bold text-black">
            <Printer className="size-4" /> KOT #214 · TABLE 7
          </div>
        </div>
      )}

      {id === "updates" && (
        <div className="w-full max-w-[250px]">
          <div className="flex items-center">
            {STAGES.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    i < 2 && "bg-leaf-500 text-white",
                    i === 2 && "bg-gold-sheen text-ink-900 [--ring-color:rgb(220_180_75/0.5)] animate-ring",
                    i > 2 && "border border-white/20 text-sand-500",
                  )}
                >
                  {i < 2 ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                {i < STAGES.length - 1 && (
                  <span className={cn("mx-1 h-px flex-1", i < 2 ? "bg-leaf-500" : "bg-white/15")} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/92 px-2.5 py-2 text-ink-900">
            <BellRing className="size-4 shrink-0 text-gold-600" />
            <p className="text-[10.5px] leading-tight font-bold">Your order is ready</p>
          </div>
        </div>
      )}

      {id === "call" && (
        <div className="flex flex-wrap justify-center gap-2">
          <span className="bg-gold-sheen rounded-full px-4 py-2.5 text-[11px] font-bold text-ink-900">Call waiter</span>
          <span className="rounded-full bg-white/8 px-4 py-2.5 text-[11px] font-bold text-sand-100">Water, please</span>
          <span className="rounded-full bg-white/8 px-4 py-2.5 text-[11px] font-bold text-sand-100">Bring the bill</span>
        </div>
      )}

      {id === "after" && (
        <div className="w-full max-w-[230px]">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="size-5 fill-gold-400 text-gold-400" />
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-white/92 px-3 py-2 text-ink-900">
            <p className="text-[9px] font-semibold tracking-wide text-ink-400 uppercase">Zaitoon · offer</p>
            <p className="text-[11px] leading-tight font-bold">Weekend BBQ night on the rooftop</p>
          </div>
        </div>
      )}
    </div>
  );
}
