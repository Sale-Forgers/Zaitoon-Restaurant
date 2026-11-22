"use client";

import { ArrowRight, BellRing, ChefHat, ConciergeBell, Gift, ScanLine } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Diamonds, Logo, Splash } from "@/components/brand";
import { Button, Checkbox, useToast } from "@/components/ui";
import { getGuest, setGuest, useGuest } from "@/lib/client/guest";
import { getPushState } from "@/lib/client/push";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { firstName } from "@/lib/format";
import type { GuestState } from "@/lib/types";
import { IosInstallSteps, usePush, WifiCard } from "./parts";

type Phase = "loading" | "error" | "welcome" | "notify";

/**
 * Where a guest lands after scanning the table's QR code or tapping its NFC tag:
 * Wi-Fi details, a one-time name prompt, then the option to switch on
 * notifications before the menu opens.
 */
export function Entry() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useGuest();
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<GuestState | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    rpc("guest.enter", { code })
      .then((s) => {
        if (cancelled) return;
        const prev = getGuest();
        setGuest({
          table: { code, number: s.table.number, zone: s.table.zone, at: Date.now() },
          // A cart built at another table does not follow the guest here.
          cart: prev.table?.code === code ? prev.cart : [],
          ...(s.guest ? { name: s.guest.name } : { creds: null, name: null }),
        });
        setState(s);
        setPhase("welcome");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const finish = () => {
    setGuest({ pushAsked: true });
    router.replace("/menu");
  };

  const next = async () => {
    const push = await getPushState();
    if (push === "ready" || push === "ios-install") setPhase("notify");
    else finish();
  };

  const register = async () => {
    setBusy(true);
    try {
      if (editing) setGuest({ creds: null, name: null });
      const res = await rpc("guest.register", { code, name, phone, marketing });
      setGuest({ creds: res.creds, name: res.state.guest?.name ?? name.trim() });
      setState(res.state);
      setEditing(false);
      await next();
    } catch (e) {
      toast({ title: "Please check your details", text: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (phase === "loading") return <Splash label="Setting up your table…" />;

  if (phase === "error" || !state) {
    return (
      <Backdrop>
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center text-sand-50">
          <Logo variant="full" className="h-20" />
          <div className="mt-10 flex size-16 items-center justify-center rounded-3xl bg-white/8 text-gold-300">
            <ScanLine className="size-8" />
          </div>
          <h1 className="font-display mt-5 text-2xl font-semibold">We could not find this table</h1>
          <p className="mt-2 max-w-xs text-sm text-sand-400">
            {error || "Please scan the QR code on your table again."} If it keeps happening, your waiter will be glad to help.
          </p>
          <Button variant="dark" className="mt-6" onClick={() => router.replace("/menu")}>
            Browse the menu
          </Button>
        </div>
      </Backdrop>
    );
  }

  const known = state.guest && !editing;

  if (phase === "notify") return <NotifyStep name={state.guest?.name ?? name} onDone={finish} />;

  return (
    <Backdrop>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-8 text-sand-50">
        <div className="animate-fade flex flex-col items-center text-center">
          <Logo variant="full" className="h-[86px]" />
          <p className="mt-7 text-[11px] font-semibold tracking-[0.32em] text-gold-300 uppercase">Welcome to</p>
          <h1 className="font-display mt-1 text-[52px] leading-none font-semibold">
            Table <span className="text-gold-sheen">{state.table.number}</span>
          </h1>
          <p className="mt-2 text-sm text-sand-400">{state.table.zone}</p>
          <Diamonds className="mt-4" />
        </div>

        <div className="animate-rise mt-7 space-y-4 [animation-delay:120ms]">
          <WifiCard wifi={state.settings.wifi} dark />

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
            {known ? (
              <>
                <p className="font-display text-2xl leading-tight font-semibold">
                  Welcome back, {firstName(state.guest!.name)}
                </p>
                <p className="mt-1 text-sm text-sand-400">
                  {state.guest!.visits > 1
                    ? `Lovely to see you again. This is visit number ${state.guest!.visits}.`
                    : "Your table is ready. Order whenever you like."}
                </p>
                <Button
                  variant="gold"
                  size="xl"
                  block
                  className="mt-5"
                  onClick={() => (session.pushAsked ? finish() : next())}
                >
                  Open the menu <ArrowRight className="size-5" />
                </Button>
                <button
                  onClick={() => {
                    setEditing(true);
                    setName("");
                  }}
                  className="mt-3 w-full text-center text-sm text-sand-400 underline-offset-4 hover:text-sand-100 hover:underline"
                >
                  Not {firstName(state.guest!.name)}?
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim().length >= 2) void register();
                }}
              >
                <p className="font-display text-2xl leading-tight font-semibold">What should we call you?</p>
                <p className="mt-1 text-sm text-sand-400">Just once. Your phone will remember you next time.</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  maxLength={40}
                  placeholder="Your name"
                  aria-label="Your name"
                  className="mt-4 h-14 w-full rounded-2xl border border-white/15 bg-black/30 px-4 text-[17px] text-sand-50 outline-none placeholder:text-sand-500 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  placeholder="Mobile number (optional)"
                  aria-label="Mobile number, optional"
                  className="mt-3 h-14 w-full rounded-2xl border border-white/15 bg-black/30 px-4 text-[17px] text-sand-50 outline-none placeholder:text-sand-500 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20"
                />
                <div className="mt-4">
                  <Checkbox checked={marketing} onChange={setMarketing} dark>
                    Send me Zaitoon&apos;s offers and special nights
                  </Checkbox>
                </div>
                <Button
                  type="submit"
                  variant="gold"
                  size="xl"
                  block
                  className="mt-5"
                  loading={busy}
                  disabled={name.trim().length < 2}
                >
                  Continue to the menu <ArrowRight className="size-5" />
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-auto pt-8 text-center text-xs text-sand-500">
          No app to install. Order, follow your food and call your waiter from this page.
        </p>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-ink-950">
      <img
        src="/images/venue/rooftop-night.webp"
        alt=""
        width={1600}
        height={1203}
        className="fixed inset-0 size-full object-cover opacity-35"
      />
      <div className="fixed inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/85 to-ink-950" />
      <div className="relative">{children}</div>
    </div>
  );
}

function NotifyStep({ name, onDone }: { name: string; onDone: () => void }) {
  const { state, busy, enable } = usePush();
  const ios = state === "ios-install";

  const points = [
    { icon: <ChefHat className="size-5" />, text: "When the kitchen starts cooking your order" },
    { icon: <ConciergeBell className="size-5" />, text: "When it is ready and on its way to your table" },
    { icon: <Gift className="size-5" />, text: "Offers and special nights, only if you want them" },
  ];

  return (
    <Backdrop>
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-8 text-sand-50">
        <div className="animate-rise flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative">
            <div className="bg-gold-sheen animate-ring flex size-24 items-center justify-center rounded-[32px] text-ink-900 shadow-gold">
              <BellRing className="size-11" strokeWidth={2} />
            </div>
            <span className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-ember-500 text-xs font-bold text-white">
              1
            </span>
          </div>
          <h1 className="font-display mt-8 text-[32px] leading-[1.1] font-semibold">
            Relax, {firstName(name) || "we"} <span className="text-gold-sheen italic">will let you know</span>
          </h1>
          <p className="mt-3 max-w-xs text-[15px] text-sand-400">
            Get a notification on this phone, even when the screen is locked. No app needed.
          </p>

          <ul className="mt-8 w-full space-y-3 text-left">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-[15px] text-sand-200">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-gold-300">{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>

          {ios && (
            <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-left">
              <p className="mb-3 text-sm font-semibold text-gold-200">On iPhone, one extra step is needed:</p>
              <IosInstallSteps dark />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {!ios && (
            <Button
              variant="gold"
              size="xl"
              block
              loading={busy}
              onClick={async () => {
                await enable();
                onDone();
              }}
            >
              Turn on notifications
            </Button>
          )}
          <Button variant={ios ? "gold" : "dark"} size={ios ? "xl" : "lg"} block onClick={onDone}>
            {ios ? "Continue to the menu" : "Not now"}
          </Button>
        </div>
      </div>
    </Backdrop>
  );
}
