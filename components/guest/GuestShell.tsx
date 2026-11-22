"use client";

import { BookOpen, ConciergeBell, Gift, ReceiptText, Wifi } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Sheet, useToast } from "@/components/ui";
import { cn } from "@/lib/format";
import { useGuestApp } from "./GuestProvider";
import { CallSheet, WifiCard } from "./parts";

const ACTIVE = ["received", "preparing", "ready", "picked_up"];

/** Phone chrome for the guest app: brand bar on top, tab bar at the bottom. */
export function GuestShell({ children }: { children: ReactNode }) {
  const { table, state } = useGuestApp();
  const pathname = usePathname();
  const toast = useToast();
  const [callOpen, setCallOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // A push that arrives while the page is open is also shown inside the app.
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "zr-push") return;
      const p = e.data.payload as { title?: string; body?: string };
      if (p?.title) toast({ title: p.title, text: p.body, tone: "info" });
    };
    sw.addEventListener("message", onMessage);
    return () => sw.removeEventListener("message", onMessage);
  }, [toast]);

  const activeOrders = state?.orders.filter((o) => ACTIVE.includes(o.status)).length ?? 0;

  const tab = (href: string, label: string, icon: ReactNode, badge?: number) => {
    const on = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-semibold transition",
          on ? "text-ink-900" : "text-ink-300",
        )}
      >
        <span className={cn("relative flex h-8 w-14 items-center justify-center rounded-full transition", on && "bg-gold-200/70")}>
          {icon}
          {badge ? (
            <span className="tabular absolute -top-0.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh bg-ink-950">
      <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-cream-100 shadow-lift">
        <header className="safe-top sticky top-0 z-30 bg-ink-900 text-sand-50">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link href="/menu" aria-label="Menu">
              <Logo className="h-8" />
            </Link>
            {table ? (
              <button
                onClick={() => setInfoOpen(true)}
                className="flex items-center gap-2 rounded-full border border-gold-500/40 bg-white/[0.06] py-1.5 pr-3 pl-2.5 text-[13px] font-semibold text-gold-200 transition hover:bg-white/10"
              >
                <Wifi className="size-4" />
                Table {table.number}
              </button>
            ) : (
              <span className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-sand-300">Browsing</span>
            )}
          </div>
          <div className="hairline-gold" />
        </header>

        <main className="pb-28">{children}</main>

        <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-ink-900/8 bg-cream-50/95 px-2 backdrop-blur">
          <div className="flex items-stretch">
            {tab("/menu", "Menu", <BookOpen className="size-5" />)}
            {tab("/orders", "My order", <ReceiptText className="size-5" />, activeOrders)}
            <button
              onClick={() =>
                table
                  ? setCallOpen(true)
                  : toast({ title: "Scan your table first", text: "Scan the QR code on your table to call a waiter.", tone: "info" })
              }
              className="relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-semibold text-ink-300"
            >
              <span className="bg-gold-sheen flex h-8 w-14 items-center justify-center rounded-full text-ink-900 shadow-gold">
                <ConciergeBell className="size-5" />
              </span>
              <span className="text-ink-700">Call waiter</span>
            </button>
            {tab("/offers", "Offers", <Gift className="size-5" />)}
          </div>
        </nav>

        {table && (
          <CallSheet open={callOpen} onClose={() => setCallOpen(false)} code={table.code} tableNumber={table.number} />
        )}

        <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title={table ? `Table ${table.number}` : "Zaitoon"}>
          {table && <p className="-mt-1 mb-4 text-sm text-ink-400">{table.zone} · Zaitoon Family Restaurant</p>}
          {state && <WifiCard wifi={state.settings.wifi} />}
          {state && (
            <div className="mt-4 space-y-1 text-sm text-ink-500">
              <p>{state.settings.restaurant.address}</p>
              <p>{state.settings.restaurant.hours}</p>
            </div>
          )}
        </Sheet>
      </div>
    </div>
  );
}
