"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clearCart, setGuest, TABLE_TTL, useGuest, type CartLine, type GuestSession } from "@/lib/client/guest";
import { useLive, useSlowNow } from "@/lib/client/live";
import { syncPush } from "@/lib/client/push";
import { RpcError, rpc } from "@/lib/client/rpc";
import { priceLine } from "@/lib/pricing";
import type { GuestState, Menu, MenuItem, OrderLine } from "@/lib/types";

export interface PricedCartLine {
  line: CartLine;
  item: MenuItem;
  priced: OrderLine;
}

interface GuestContextValue {
  session: GuestSession;
  /** The table this phone is linked to (null when browsing without a scan). */
  table: GuestSession["table"];
  state: GuestState | null;
  menu: Menu | null;
  items: Map<string, MenuItem>;
  cart: PricedCartLine[];
  cartCount: number;
  cartTotal: number;
  refresh: () => Promise<void>;
  /** True while the first load is still running. */
  loading: boolean;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export function useGuestApp(): GuestContextValue {
  const v = useContext(GuestContext);
  if (!v) throw new Error("useGuestApp must be used inside <GuestProvider>");
  return v;
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const session = useGuest();
  const router = useRouter();
  const pathname = usePathname();

  // A scan links the phone to a table for a few hours; after that it is browse-only.
  const now = useSlowNow();
  const table = session.table && now - session.table.at < TABLE_TTL ? session.table : null;
  const code = table?.code ?? "";

  const live = useLive<GuestState | null>(() => (code ? rpc("guest.state", { code }) : Promise.resolve(null)), code);
  const state = code ? live.data : null;

  // The table code was changed or removed by the manager: drop the stale link.
  useEffect(() => {
    if (live.error instanceof RpcError && live.error.code === "TABLE_NOT_FOUND") {
      setGuest({ table: null, cart: [] });
    }
  }, [live.error]);

  // Linked to a table but the server does not know this phone (first visit, or
  // data was reset): go through the welcome step so the guest gives their name.
  useEffect(() => {
    if (!code || !state) return;
    if (!state.guest && !pathname.startsWith("/t/")) {
      if (session.creds) setGuest({ creds: null, name: null });
      router.replace(`/t/${code}`);
    }
  }, [code, state, session.creds, pathname, router]);

  // Menu: loaded once, then again only when the manager changes it.
  const [menu, setMenu] = useState<Menu | null>(null);
  const loadedRev = useRef<number | null>(null);
  const rev = state?.menuRev ?? 0;
  useEffect(() => {
    if (loadedRev.current === rev && menu) return;
    let cancelled = false;
    rpc("menu.get")
      .then((m) => {
        if (cancelled) return;
        loadedRev.current = rev;
        setMenu(m);
      })
      .catch(() => {
        /* the page shows its own retry state */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);

  // Keep the push subscription registered on the server (cheap no-op otherwise).
  const guestId = session.creds?.id;
  useEffect(() => {
    if (guestId) void syncPush();
  }, [guestId]);

  const items = useMemo(() => new Map((menu?.items ?? []).map((i) => [i.id, i])), [menu]);

  const cart = useMemo<PricedCartLine[]>(() => {
    const out: PricedCartLine[] = [];
    for (const line of session.cart) {
      const item = items.get(line.itemId);
      if (item) out.push({ line, item, priced: priceLine(item, line) });
    }
    return out;
  }, [session.cart, items]);

  // Dishes removed from the menu while they sat in a cart are dropped quietly.
  useEffect(() => {
    if (menu && session.cart.length && cart.length === 0) clearCart();
  }, [menu, session.cart.length, cart.length]);

  const refresh = live.refresh;
  const value = useMemo<GuestContextValue>(
    () => ({
      session,
      table,
      state,
      menu,
      items,
      cart,
      cartCount: cart.reduce((a, c) => a + c.priced.qty, 0),
      cartTotal: cart.reduce((a, c) => a + c.priced.total, 0),
      refresh,
      loading: !menu || (Boolean(code) && live.loading),
    }),
    [session, table, state, menu, items, cart, refresh, code, live.loading],
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}
