"use client";

import {
  ChefHat,
  ClipboardList,
  ConciergeBell,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Presentation,
  QrCode,
  Settings,
  Star,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { PrintProvider } from "@/components/print/PrintHost";
import { StaffGate, useStaff } from "@/components/staff/StaffGate";
import { setServerNow, useLive, useOnline, type Live } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { cn } from "@/lib/format";
import type { StaffBoard } from "@/lib/types";
import { ConfirmProvider } from "./parts";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "calls";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Live orders", icon: ClipboardList, badge: "orders" },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode, badge: "calls" },
  { href: "/admin/menu", label: "Menu", icon: Utensils },
  { href: "/admin/guests", label: "Guests", icon: Users },
  { href: "/admin/notifications", label: "Notifications", icon: Megaphone },
  { href: "/admin/feedback", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const SCREENS = [
  { href: "/kitchen", label: "Kitchen display", icon: ChefHat },
  { href: "/waiter", label: "Waiter app", icon: ConciergeBell },
  { href: "/", label: "System overview", icon: Presentation },
];

const BoardContext = createContext<Live<StaffBoard> | null>(null);

/** The live floor state (tables, open orders, calls, settings), loaded once for every admin page. */
export function useBoard(): Live<StaffBoard> {
  const board = useContext(BoardContext);
  if (!board) throw new Error("useBoard must be used inside the admin shell");
  return board;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <StaffGate role="admin">
      <PrintProvider>
        <ConfirmProvider>
          <Frame>{children}</Frame>
        </ConfirmProvider>
      </PrintProvider>
    </StaffGate>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const board = useLive(() => rpc("staff.board"), "board");
  const pathname = usePathname();
  const online = useOnline();
  const { session, logout } = useStaff();

  const serverNow = board.data?.now;
  useEffect(() => {
    if (serverNow) setServerNow(serverNow);
  }, [serverNow]);

  // On phones the tabs scroll sideways: keep the current one in view.
  const activeTab = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  const counts = {
    orders: board.data?.orders.filter((o) => ["received", "preparing", "ready", "picked_up"].includes(o.status)).length ?? 0,
    calls: board.data?.calls.filter((c) => c.status === "open").length ?? 0,
  };
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <BoardContext.Provider value={board}>
      <div className="min-h-dvh bg-cream-100 lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="bg-ink-sheen fixed inset-y-0 left-0 z-30 hidden w-64 flex-col text-sand-200 lg:flex">
          <Link href="/admin" className="px-6 pt-7 pb-5" aria-label="Admin dashboard">
            <Logo variant="full" className="h-[58px]" />
          </Link>
          <div className="hairline-gold mx-6 opacity-50" />

          <nav className="thin-scrollbar mt-4 flex-1 overflow-y-auto px-3" aria-label="Admin">
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.2em] text-sand-500 uppercase">Manage</p>
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(item.href);
                const count = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition",
                        active ? "bg-white/[0.07] text-gold-300" : "text-sand-400 hover:bg-white/[0.04] hover:text-sand-50",
                      )}
                    >
                      {active && <span className="bg-gold-sheen absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full" />}
                      <item.icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                            item.badge === "calls" ? "bg-ruby-500 text-white" : "bg-gold-sheen text-ink-900",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <p className="px-3 pt-7 pb-2 text-[10px] font-semibold tracking-[0.2em] text-sand-500 uppercase">Open a screen</p>
            <ul className="space-y-1">
              {SCREENS.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-sand-400 transition hover:bg-white/[0.04] hover:text-sand-50"
                  >
                    <s.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                    <span className="flex-1">{s.label}</span>
                    <ExternalLink className="size-3.5 opacity-0 transition group-hover:opacity-70" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3 border-t border-white/8 p-4">
            <LiveChip online={online} durable={board.data?.durable ?? true} />
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5">
              <span className="bg-gold-sheen flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink-900">
                {session.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-sand-50">{session.name}</p>
                <p className="text-[11px] text-sand-500">Admin access</p>
              </div>
              <button
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="flex size-9 items-center justify-center rounded-full text-sand-400 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-[18px]" />
              </button>
            </div>
          </div>
        </aside>

        {/* Phone / tablet header */}
        <header className="no-print sticky top-0 z-30 bg-ink-900 text-sand-50 lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <img src="/icons/icon-192.png" alt="" className="size-9 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-base leading-tight font-semibold">Admin Panel</p>
              <p className="truncate text-[11px] text-sand-500">Zaitoon Family Restaurant</p>
            </div>
            <span
              className={cn("size-2.5 rounded-full", online ? "animate-pulse bg-leaf-400" : "bg-ruby-400")}
              title={online ? "Live" : "Reconnecting"}
            />
            <button
              onClick={logout}
              aria-label="Sign out"
              className="flex size-10 items-center justify-center rounded-full text-sand-300 transition active:bg-white/10"
            >
              <LogOut className="size-5" />
            </button>
          </div>
          <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-3" aria-label="Admin">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const count = item.badge ? counts[item.badge] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={active ? activeTab : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
                    active ? "bg-gold-sheen text-ink-900" : "bg-white/[0.07] text-sand-300",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "tabular flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        active ? "bg-ink-900 text-gold-200" : item.badge === "calls" ? "bg-ruby-500 text-white" : "bg-gold-400 text-ink-900",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
            {SCREENS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-[13px] font-semibold text-sand-400"
              >
                <s.icon className="size-4" />
                {s.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      </div>
    </BoardContext.Provider>
  );
}

function LiveChip({ online, durable }: { online: boolean; durable: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1.5 text-xs font-medium">
      <span className={cn("size-2 rounded-full", online ? "animate-pulse bg-leaf-400" : "bg-ruby-400")} />
      <span className={online ? "text-leaf-400" : "text-ruby-400"}>{online ? "Live" : "Reconnecting…"}</span>
      {!durable && <span className="ml-auto rounded-full bg-ember-500/20 px-2 py-0.5 text-[10px] text-ember-400">Temporary data</span>}
    </div>
  );
}
