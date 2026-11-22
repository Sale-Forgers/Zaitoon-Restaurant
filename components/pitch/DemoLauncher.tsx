"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChefHat,
  ConciergeBell,
  Copy,
  Info,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Qr } from "@/components/Qr";
import { useMounted } from "@/components/ui";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { cn } from "@/lib/format";

export interface DemoInfo {
  tables: { number: number; zone: string; code: string }[];
  baseUrl: string;
  durable: boolean;
}

/** Loads the demo tables once (no polling) and reloads on demand. */
export function useDemoInfo() {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    rpc("demo.info")
      .then((d) => {
        if (!alive) return;
        setInfo(d);
        setError(null);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  return { info, error, reload: () => setAttempt((n) => n + 1) };
}

export const isLocalHost = (hostname: string) => /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(hostname);

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs https: fall back to the old selection trick.
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
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
}

const SCREENS: { title: string; text: string; href: string; icon: ReactNode }[] = [
  {
    title: "Kitchen display",
    text: "Tickets arrive here the moment a guest orders.",
    href: "/kitchen",
    icon: <ChefHat className="size-5" strokeWidth={1.7} />,
  },
  {
    title: "Waiter app",
    text: "Table map, calls and order taking on a tablet.",
    href: "/waiter",
    icon: <ConciergeBell className="size-5" strokeWidth={1.7} />,
  },
  {
    title: "Admin panel",
    text: "Menu, tables, QR codes, guests and reports.",
    href: "/admin",
    icon: <LayoutDashboard className="size-5" strokeWidth={1.7} />,
  },
];

/** The scannable demo table plus one-click links to every live screen. */
export function DemoLauncher() {
  const mounted = useMounted();
  const { info, error, reload } = useDemoInfo();
  const [pick, setPick] = useState(0);
  const [copied, setCopied] = useState(false);

  const table = info?.tables[Math.min(pick, (info?.tables.length ?? 1) - 1)];
  const origin = mounted ? window.location.origin : "";
  const base = info?.baseUrl || origin;
  const url = table && base ? `${base}/t/${table.code}` : "";
  const local = mounted && !info?.baseUrl && isLocalHost(window.location.hostname);

  const copy = async () => {
    if (!url) return;
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
      {/* The table card, as it would stand on the table */}
      <div className="mx-auto w-full max-w-[420px] min-w-0">
        <div className="relative rounded-[36px] bg-cream-50 p-7 text-center text-ink-900 shadow-lift ring-1 ring-gold-300/70">
          <div className="pointer-events-none absolute inset-3 rounded-[28px] border border-gold-500/35" />
          <div className="relative">
            <Logo className="mx-auto h-12" />
            <p className="mt-4 text-[11px] font-bold tracking-[0.24em] text-gold-700 uppercase">Scan to order</p>
            <div className="mx-auto mt-4 flex size-[236px] items-center justify-center rounded-3xl bg-white p-2 shadow-soft">
              {url ? (
                <Qr value={url} size={220} margin={1} />
              ) : error ? (
                <div className="px-4 text-sm text-ink-500">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-cream-50"
                  >
                    <RefreshCw className="size-3.5" /> Try again
                  </button>
                </div>
              ) : (
                <div className="skeleton size-full rounded-2xl" />
              )}
            </div>
            <p className="font-display mt-5 text-4xl leading-none font-semibold">
              {table ? `Table ${table.number}` : "Table"}
            </p>
            <p className="mt-1.5 text-sm text-ink-400">{table?.zone ?? "Loading the demo tables"}</p>
          </div>
        </div>

        {info && info.tables.length > 1 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a demo table">
            {info.tables.map((t, i) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setPick(i)}
                aria-pressed={i === pick}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
                  i === pick ? "bg-gold-sheen text-ink-900" : "bg-white/8 text-sand-300 hover:bg-white/12",
                )}
              >
                Table {t.number}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* min-w-0 lets the long link truncate instead of widening the column */}
      <div className="min-w-0">
        <p className="text-base leading-relaxed text-sand-300 sm:text-lg">
          <span className="font-semibold text-sand-50">Scan with your phone:</span> this is exactly what a guest sees at
          {table ? ` Table ${table.number}` : " the table"}. Enter a name, place an order and keep this screen open to
          watch it travel through the kitchen.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1.5 pr-1.5 pl-5">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-sand-200" title={url}>
              {url || "Preparing the link"}
            </span>
            <button
              type="button"
              onClick={copy}
              disabled={!url}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[13px] font-semibold text-sand-50 transition hover:bg-white/15 disabled:opacity-40"
            >
              {copied ? <Check className="size-4 text-leaf-400" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <a
            href={url || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!url}
            className={cn(
              "bg-gold-sheen inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-ink-900 shadow-gold transition hover:brightness-105",
              !url && "pointer-events-none opacity-50",
            )}
          >
            <Smartphone className="size-4" />
            Open guest view
          </a>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {SCREENS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-[22px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-gold-400/40 hover:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/8 text-gold-300">
                  {s.icon}
                </span>
                <ArrowUpRight className="size-4 text-sand-500 transition group-hover:text-gold-300" />
              </div>
              <p className="font-display mt-4 text-lg font-semibold text-sand-50">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-sand-400">{s.text}</p>
            </a>
          ))}
        </div>

        <Link
          href="/demo"
          className="mt-3 flex items-center justify-between gap-4 rounded-[22px] border border-gold-400/35 bg-gold-400/[0.08] p-5 transition hover:bg-gold-400/[0.13]"
        >
          <div>
            <p className="font-display text-lg font-semibold text-sand-50">Open Demo Studio</p>
            <p className="mt-0.5 text-[13px] text-sand-300">
              The guest&apos;s phone, the kitchen and the waiter, live side by side on one screen.
            </p>
          </div>
          <span className="bg-gold-sheen flex size-10 shrink-0 items-center justify-center rounded-full text-ink-900">
            <ArrowRight className="size-5" />
          </span>
        </Link>

        <ul className="mt-6 space-y-2.5 text-[13px] leading-relaxed text-sand-400">
          <li className="flex gap-2.5">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-gold-300" />
            Kitchen, waiter and admin screens are protected by a staff PIN. Your presenter has it.
          </li>
          {local && (
            <li className="flex gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-gold-300" />
              This page is open on localhost, which a phone cannot reach. To scan from a phone, open the site through
              its public address or this computer&apos;s network address.
            </li>
          )}
          {info && !info.durable && (
            <li className="flex gap-2.5">
              <Info className="mt-0.5 size-4 shrink-0 text-gold-300" />
              No database is connected to this server yet, so demo data is temporary.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
