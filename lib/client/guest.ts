"use client";

import { useSyncExternalStore } from "react";
import type { OrderLineInput } from "@/lib/types";

/**
 * Everything the guest's phone remembers: who they are (so they are greeted by
 * name next time and never asked twice), which table they scanned, and their cart.
 * It lives in localStorage: no account, no app, no login.
 */

export interface CartLine extends OrderLineInput {
  key: string;
}

export interface GuestSession {
  creds: { id: string; token: string } | null;
  name: string | null;
  table: { code: string; number: number; zone: string; at: number } | null;
  cart: CartLine[];
  /** True once the "turn on notifications" step has been shown. */
  pushAsked: boolean;
}

const KEY = "zr.guest.v1";
const EMPTY: GuestSession = { creds: null, name: null, table: null, cart: [], pushAsked: false };
/** A scan stays valid for this long; after that the guest scans the table again. */
export const TABLE_TTL = 6 * 3_600_000;

let state: GuestSession = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): GuestSession {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<GuestSession>;
    return {
      creds: p.creds?.id && p.creds.token ? { id: p.creds.id, token: p.creds.token } : null,
      name: p.name ?? null,
      table: p.table?.code ? p.table : null,
      cart: Array.isArray(p.cart) ? p.cart : [],
      pushAsked: Boolean(p.pushAsked),
    };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
}

function write(next: GuestSession) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory for this visit */
  }
  listeners.forEach((l) => l());
}

export function getGuest(): GuestSession {
  ensureLoaded();
  return state;
}

export function setGuest(patch: Partial<GuestSession>) {
  ensureLoaded();
  write({ ...state, ...patch });
}

export function forgetGuest() {
  write(EMPTY);
}

export function useGuest(): GuestSession {
  return useSyncExternalStore(
    (cb) => {
      ensureLoaded();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getGuest,
    () => EMPTY,
  );
}

/** The table the phone is currently linked to, or null when the scan has expired. */
export function activeTable(session: GuestSession, now: number) {
  if (!session.table) return null;
  return now - session.table.at < TABLE_TTL ? session.table : null;
}

// ───────────────────────────── Cart ─────────────────────────────

/** Identity of a cart line: the same dish with the same options merges into one line. */
export const cartKey = (l: OrderLineInput) =>
  [l.itemId, l.variantId ?? "", (l.choices ?? []).join("|"), [...(l.extraIds ?? [])].sort().join("|"), l.note ?? ""].join("~");

export function addToCart(line: OrderLineInput) {
  const s = getGuest();
  const key = cartKey(line);
  const existing = s.cart.find((c) => c.key === key);
  const cart = existing
    ? s.cart.map((c) => (c.key === key ? { ...c, qty: Math.min(50, c.qty + line.qty) } : c))
    : [...s.cart, { ...line, key }];
  setGuest({ cart });
}

export function setCartQty(key: string, qty: number) {
  const s = getGuest();
  setGuest({
    cart: qty <= 0 ? s.cart.filter((c) => c.key !== key) : s.cart.map((c) => (c.key === key ? { ...c, qty: Math.min(50, qty) } : c)),
  });
}

export function clearCart() {
  setGuest({ cart: [] });
}

/** How many of a dish are in the cart, across all its variations. */
export function cartCountFor(cart: CartLine[], itemId: string) {
  return cart.reduce((a, c) => (c.itemId === itemId ? a + c.qty : a), 0);
}
