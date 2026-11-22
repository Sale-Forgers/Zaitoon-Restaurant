"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  ChefHat,
  ConciergeBell,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Splash } from "@/components/brand";
import { ClientOnly } from "@/components/ui";
import { cn } from "@/lib/format";
import { useDemoInfo } from "./DemoLauncher";

/**
 * Presenter's control room: the guest's phone, the kitchen display and the
 * waiter app run side by side as live, same-origin frames. An order placed in
 * the phone appears in the kitchen the moment it is sent.
 */
export function DemoStudio() {
  return (
    <ClientOnly fallback={<Splash label="Opening the Demo Studio" />}>
      <Studio />
    </ClientOnly>
  );
}

type Layout = "all" | "kitchen" | "waiter";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const STEPS = [
  "Enter a name in the phone",
  "Place an order",
  "Watch it arrive in the kitchen",
  "Move it to Ready",
  "See the phone update",
];

function Studio() {
  const { info, error, reload } = useDemoInfo();
  const [pick, setPick] = useState(0);
  const [layout, setLayout] = useState<Layout>("all");
  const [nonce, setNonce] = useState({ guest: 0, kitchen: 0, waiter: 0 });
  const wide = useMedia("(min-width: 1024px)");
  const extraWide = useMedia("(min-width: 1440px)");

  const table = info?.tables[Math.min(pick, (info?.tables.length ?? 1) - 1)];
  const guestSrc = table ? `/t/${table.code}` : "";
  // Three panes only fit on a wide screen: otherwise fall back to phone + kitchen.
  const view: Layout = layout === "all" && !extraWide ? "kitchen" : layout;
  const bump = (pane: keyof typeof nonce) => setNonce((n) => ({ ...n, [pane]: n[pane] + 1 }));

  const layouts: { value: Layout; label: string }[] = [
    ...(extraWide ? [{ value: "all" as const, label: "All three" }] : []),
    { value: "kitchen", label: "Phone + Kitchen" },
    { value: "waiter", label: "Phone + Waiter" },
  ];

  return (
    <div className="bg-ink-sheen flex min-h-dvh flex-col text-sand-50 lg:h-dvh">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/8 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Back to the proposal">
          <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
          <div>
            <h1 className="font-display text-lg leading-tight font-semibold">Demo Studio</h1>
            <p className="text-xs text-sand-500">Phone, kitchen and waiter, live on one screen</p>
          </div>
        </Link>

        {wide && (
          <div className="mx-auto inline-flex rounded-full bg-white/8 p-1" role="group" aria-label="Layout">
            {layouts.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLayout(l.value)}
                aria-pressed={view === l.value}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold transition",
                  view === l.value ? "bg-gold-sheen text-ink-900" : "text-sand-300 hover:text-sand-50",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-sand-400">
            <span className="hidden sm:inline">Guest table</span>
            <select
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              disabled={!info}
              className="h-10 rounded-full border border-white/12 bg-ink-800 px-4 text-[13px] font-semibold text-sand-50 focus:border-gold-400 focus:outline-none"
            >
              {(info?.tables ?? []).map((t, i) => (
                <option key={t.code} value={i}>
                  Table {t.number} · {t.zone}
                </option>
              ))}
              {!info && <option value={0}>Loading</option>}
            </select>
          </label>
          <a
            href="/admin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 px-4 text-[13px] font-semibold text-sand-100 transition hover:bg-white/8"
          >
            <LayoutDashboard className="size-4 text-gold-300" />
            <span className="hidden sm:inline">Admin panel</span>
            <ArrowUpRight className="size-3.5 text-sand-500" />
          </a>
          <Link
            href="/"
            className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-sand-400 transition hover:text-sand-50 md:inline-flex"
          >
            <ArrowLeft className="size-4" />
            Proposal
          </Link>
        </div>
      </header>

      {/* What to do */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-white/6 px-4 py-2.5 sm:px-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex shrink-0 items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-gold-400/15 text-[11px] font-bold text-gold-300">
              {i + 1}
            </span>
            <span className="text-[13px] font-medium whitespace-nowrap text-sand-200">{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1.5 h-px w-5 bg-white/15" aria-hidden />}
          </div>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 pl-6 text-xs whitespace-nowrap text-sand-500 xl:flex">
          <LockKeyhole className="size-3.5" />
          Kitchen and waiter panes ask for the staff PIN once
        </span>
      </div>

      {/* Panes */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5 lg:flex-row">
        <Pane
          className="lg:w-[404px] lg:shrink-0"
          icon={<Smartphone className="size-4" />}
          title={table ? `Guest phone · Table ${table.number}` : "Guest phone"}
          href={guestSrc || undefined}
          onReload={() => bump("guest")}
        >
          <div className="flex h-[720px] max-h-[82dvh] items-center justify-center p-3 lg:h-full lg:max-h-none">
            <div className="relative h-full w-[372px] max-w-full rounded-[44px] border border-white/15 bg-ink-800 px-[9px] pt-[24px] pb-[9px] shadow-lift lg:max-h-[860px]">
              <span className="absolute top-[9px] left-1/2 h-[6px] w-14 -translate-x-1/2 rounded-full bg-white/15" aria-hidden />
              {guestSrc ? (
                <iframe
                  key={`${guestSrc}:${nonce.guest}`}
                  src={guestSrc}
                  title={`Guest app at Table ${table?.number}`}
                  loading="lazy"
                  className="size-full rounded-[34px] border-0 bg-ink-900"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-4 rounded-[34px] bg-ink-900 px-6 text-center">
                  {error ? (
                    <>
                      <p className="text-sm text-sand-300">{error}</p>
                      <button
                        type="button"
                        onClick={reload}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
                      >
                        <RefreshCw className="size-4" /> Try again
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-sand-500">Loading the demo tables</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Pane>

        {wide ? (
          <>
            {view !== "waiter" && (
              <Pane
                className="min-w-0 flex-1"
                icon={<ChefHat className="size-4" />}
                title="Kitchen display"
                href="/kitchen"
                onReload={() => bump("kitchen")}
              >
                <ScaledFrame key={nonce.kitchen} src="/kitchen" title="Kitchen display" virtualWidth={1180} />
              </Pane>
            )}
            {view !== "kitchen" && (
              <Pane
                className="min-w-0 flex-1"
                icon={<ConciergeBell className="size-4" />}
                title="Waiter app"
                href="/waiter"
                onReload={() => bump("waiter")}
              >
                <ScaledFrame key={nonce.waiter} src="/waiter" title="Waiter app" virtualWidth={1024} />
              </Pane>
            )}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <p className="text-sm text-sand-400 sm:col-span-3">
              On a wider screen the kitchen and waiter run right here beside the phone. On this screen, open them in
              their own tabs:
            </p>
            <ScreenLink href="/kitchen" icon={<ChefHat className="size-5" />} title="Kitchen display" />
            <ScreenLink href="/waiter" icon={<ConciergeBell className="size-5" />} title="Waiter app" />
            <ScreenLink href="/admin" icon={<LayoutDashboard className="size-5" />} title="Admin panel" />
          </div>
        )}
      </main>
    </div>
  );
}

function Pane({
  title,
  icon,
  href,
  onReload,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  href?: string;
  onReload: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-ink-900/70",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/8 px-4">
        <span className="text-gold-300">{icon}</span>
        <h2 className="truncate text-[13px] font-semibold text-sand-100">{title}</h2>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-leaf-400">
          <span className="size-1.5 animate-pulse rounded-full bg-leaf-400" />
          Live
        </span>
        <button
          type="button"
          onClick={onReload}
          title="Reload this pane"
          aria-label={`Reload ${title}`}
          className="flex size-8 items-center justify-center rounded-full text-sand-400 transition hover:bg-white/10 hover:text-sand-50"
        >
          <RefreshCw className="size-3.5" />
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title="Open in a new tab"
            aria-label={`Open ${title} in a new tab`}
            className="flex size-8 items-center justify-center rounded-full text-sand-400 transition hover:bg-white/10 hover:text-sand-50"
          >
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/**
 * Shows a staff screen at its real desktop width and scales it down to fit the
 * pane, so the presenter sees the true layout rather than a squeezed one.
 */
function ScaledFrame({ src, title, virtualWidth }: { src: string; title: string; virtualWidth: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size ? Math.min(1, size.w / virtualWidth) : 1;

  return (
    <div ref={box} className="relative size-full overflow-hidden bg-ink-950">
      {size && size.w > 0 && size.h > 0 && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{
            width: scale < 1 ? virtualWidth : "100%",
            height: size.h / scale,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        />
      )}
    </div>
  );
}

function ScreenLink({ href, icon, title }: { href: string; icon: ReactNode; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-gold-400/40"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-white/8 text-gold-300">{icon}</span>
      <span className="font-display text-lg font-semibold">{title}</span>
      <ArrowUpRight className="ml-auto size-4 text-sand-500" />
    </a>
  );
}
