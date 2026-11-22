"use client";

import { ChefHat, ConciergeBell, Delete, LayoutDashboard, LockKeyhole, LogOut, WifiOff } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo, Splash } from "@/components/brand";
import { ClientOnly, ToastProvider } from "@/components/ui";
import { useLive, useNow, useOnline } from "@/lib/client/live";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { unlockSound } from "@/lib/client/sound";
import { clock, cn } from "@/lib/format";
import type { StaffRole, StaffSession } from "@/lib/types";

const ROLE: Record<StaffRole, { title: string; blurb: string; icon: ReactNode }> = {
  kitchen: {
    title: "Kitchen Display",
    blurb: "Live tickets for the kitchen team",
    icon: <ChefHat className="size-7" />,
  },
  waiter: {
    title: "Waiter App",
    blurb: "Tables, calls and order taking",
    icon: <ConciergeBell className="size-7" />,
  },
  admin: {
    title: "Admin Panel",
    blurb: "Full control for the manager",
    icon: <LayoutDashboard className="size-7" />,
  },
};

interface StaffValue {
  session: StaffSession;
  logout: () => Promise<void>;
}
const StaffContext = createContext<StaffValue | null>(null);

export function useStaff(): StaffValue {
  const v = useContext(StaffContext);
  if (!v) throw new Error("useStaff must be used inside <StaffGate>");
  return v;
}

/**
 * Wraps a staff screen: shows the PIN pad until someone with the right role
 * (or the manager) signs in on this device.
 */
export function StaffGate({ role, children }: { role: StaffRole; children: ReactNode }) {
  return (
    <ClientOnly fallback={<Splash />}>
      <ToastProvider>
        <Gate role={role}>{children}</Gate>
      </ToastProvider>
    </ClientOnly>
  );
}

function Gate({ role, children }: { role: StaffRole; children: ReactNode }) {
  const me = useLive(() => rpc("staff.me"), "me");
  const logout = useCallback(async () => {
    await rpc("staff.logout");
    await me.refresh();
  }, [me]);

  if (!me.data) {
    if (me.error) {
      return (
        <div className="bg-ink-sheen flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-sand-300">
          <WifiOff className="size-8 text-gold-400" />
          <p className="font-display text-xl text-sand-50">Cannot reach the server</p>
          <p className="max-w-xs text-sm text-sand-500">{errorMessage(me.error)}</p>
          <button onClick={() => me.refresh()} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">
            Try again
          </button>
        </div>
      );
    }
    return <Splash />;
  }

  const session = me.data.session;
  const allowed = session && (session.role === role || session.role === "admin");
  if (!allowed) {
    return (
      <PinScreen
        role={role}
        waiters={me.data.waiters}
        pinLength={me.data.pinLength[role]}
        hint={me.data.hints?.[role]}
        onDone={me.refresh}
      />
    );
  }
  return <StaffContext.Provider value={{ session, logout }}>{children}</StaffContext.Provider>;
}

function PinScreen({
  role,
  waiters,
  pinLength,
  hint,
  onDone,
}: {
  role: StaffRole;
  waiters: string[];
  pinLength: number;
  hint?: string;
  onDone: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [name, setName] = useState(waiters[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = ROLE[role];

  const submit = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      try {
        await rpc("staff.login", { role, pin: value, name: role === "waiter" ? name : undefined });
        unlockSound();
        await onDone();
      } catch (e) {
        setError(errorMessage(e));
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [role, name, onDone],
  );

  const press = useCallback(
    (digit: string) => {
      if (busy) return;
      setError(null);
      setPin((p) => {
        if (p.length >= pinLength) return p;
        const next = p + digit;
        if (next.length === pinLength) void submit(next);
        return next;
      });
    },
    [busy, pinLength, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="bg-ink-sheen flex min-h-dvh flex-col items-center justify-center px-5 py-10 text-sand-50">
      <Link href="/" aria-label="Back to overview">
        <Logo variant="full" className="h-16" />
      </Link>

      <div className="animate-rise mt-8 w-full max-w-sm rounded-[32px] border border-white/8 bg-white/[0.04] p-7 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="bg-gold-sheen flex size-14 shrink-0 items-center justify-center rounded-2xl text-ink-900">
            {meta.icon}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{meta.title}</h1>
            <p className="text-sm text-sand-400">{meta.blurb}</p>
          </div>
        </div>

        {role === "waiter" && waiters.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold tracking-widest text-sand-500 uppercase">Who is signing in?</p>
            <div className="flex flex-wrap gap-2">
              {waiters.map((w) => (
                <button
                  key={w}
                  onClick={() => setName(w)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    name === w ? "bg-gold-sheen text-ink-900" : "bg-white/8 text-sand-200 hover:bg-white/12",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex items-center justify-center gap-2 text-sm text-sand-400">
          <LockKeyhole className="size-4" /> Enter your staff PIN
        </div>
        <div className={cn("mt-4 flex justify-center gap-3", error && "animate-nudge")}>
          {Array.from({ length: pinLength }, (_, i) => (
            <span
              key={i}
              className={cn(
                "size-3.5 rounded-full border transition",
                i < pin.length ? "border-gold-400 bg-gold-400" : "border-white/25",
              )}
            />
          ))}
        </div>
        <p className={cn("mt-3 h-5 text-center text-sm", error ? "text-ruby-400" : "text-sand-500")}>
          {error ?? (busy ? "Checking…" : hint ? `Demo PIN: ${hint}` : "")}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => press(d)}>
              {d}
            </Key>
          ))}
          <span />
          <Key onClick={() => press("0")}>0</Key>
          <Key onClick={() => setPin((p) => p.slice(0, -1))} label="Delete">
            <Delete className="size-6" />
          </Key>
        </div>
      </div>

      <Link href="/" className="mt-8 text-sm text-sand-500 underline-offset-4 hover:text-sand-200 hover:underline">
        Back to overview
      </Link>
    </div>
  );
}

function Key({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-16 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl font-semibold transition hover:bg-white/10 active:scale-95 active:bg-white/15"
    >
      {children}
    </button>
  );
}

/** Dark top bar shared by the kitchen and waiter screens. */
export function StaffBar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { session, logout } = useStaff();
  const online = useOnline();
  const now = useNow();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-white/8 bg-ink-900/95 text-sand-50 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Overview">
          <img src="/icons/icon-192.png" alt="" className="size-10 rounded-xl" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display truncate text-lg leading-tight font-semibold">{title}</h1>
          <p className="truncate text-xs text-sand-500">{subtitle ?? "Zaitoon Family Restaurant"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <span
            className={cn(
              "hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex",
              online ? "bg-leaf-500/15 text-leaf-400" : "bg-ruby-500/20 text-ruby-400",
            )}
          >
            <span className={cn("size-2 rounded-full", online ? "animate-pulse bg-leaf-400" : "bg-ruby-400")} />
            {online ? "Live" : "Reconnecting"}
          </span>
          <span className="tabular hidden text-sm font-semibold text-sand-200 md:inline">{now ? clock(now) : ""}</span>
          <span className="hidden rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-sand-200 sm:inline">
            {session.name}
          </span>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex size-10 items-center justify-center rounded-full text-sand-300 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
