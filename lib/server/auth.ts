import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Guest, StaffRole, StaffSession } from "@/lib/types";
import { C } from "./db";
import type { Store } from "./store";

export const STAFF_COOKIE = "zr_staff";
export const STAFF_COOKIE_DAYS = 30;

const sign = (body: string, secret: string) =>
  createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(session: StaffSession, secret: string): string {
  const body = Buffer.from(
    JSON.stringify({ r: session.role, n: session.name, e: Date.now() + STAFF_COOKIE_DAYS * 86_400_000 }),
  ).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string | undefined, secret: string): StaffSession | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { r: StaffRole; n: string; e: number };
    if (!p.e || p.e < Date.now()) return null;
    if (!["admin", "kitchen", "waiter"].includes(p.r)) return null;
    return { role: p.r, name: String(p.n || "Staff") };
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checks the device credentials a phone sends with every request. */
export async function authGuest(
  store: Store,
  creds: { id?: string; token?: string } | null | undefined,
): Promise<Guest | null> {
  if (!creds?.id || !creds.token) return null;
  const guest = await store.get<Guest>(C.guests, String(creds.id));
  if (!guest || !safeEqual(guest.token, String(creds.token))) return null;
  return guest;
}
