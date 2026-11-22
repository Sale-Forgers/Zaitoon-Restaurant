import "server-only";
import { createECDH } from "node:crypto";
import { sendNotification, WebPushError } from "web-push";
import type { Guest, PushSub, StaffRole } from "@/lib/types";
import { C, getSecrets, logEvent, type Secrets } from "./db";
import type { Store } from "./store";

/**
 * Web Push with our own VAPID keys: the open browser standard.
 * No Firebase project, OneSignal account or any other notification vendor is
 * involved. The server talks straight to the push endpoint the browser gave us.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Where a tap on the notification should land. */
  url?: string;
  /** Notifications with the same tag replace each other on the phone. */
  tag?: string;
  kind?: "order" | "call" | "feedback" | "promo" | "staff" | "test";
}

interface SendOptions {
  /** How long the push service keeps trying if the phone is offline (seconds). */
  ttl?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
}

function generateVapidKeys() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  let priv = ecdh.getPrivateKey();
  if (priv.length < 32) priv = Buffer.concat([Buffer.alloc(32 - priv.length), priv]);
  return { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: priv.toString("base64url") };
}

export async function vapid(store: Store) {
  const subject = process.env.VAPID_SUBJECT || "https://zaitoonfamilyrestaurant.com";
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject,
    };
  }
  let secrets = await getSecrets(store);
  if (!secrets.vapidPublic || !secrets.vapidPrivate) {
    const keys = generateVapidKeys();
    const stored = await store.get<Secrets>(C.secrets, "main");
    // Another instance may have generated keys a moment ago: theirs win.
    if (stored?.vapidPublic && stored.vapidPrivate) {
      secrets = { ...secrets, vapidPublic: stored.vapidPublic, vapidPrivate: stored.vapidPrivate };
    } else {
      secrets = { ...secrets, vapidPublic: keys.publicKey, vapidPrivate: keys.privateKey };
      await store.put<Secrets>(C.secrets, {
        id: "main",
        sessionSecret: stored?.sessionSecret ?? secrets.sessionSecret,
        vapidPublic: keys.publicKey,
        vapidPrivate: keys.privateKey,
      });
    }
  }
  return { publicKey: secrets.vapidPublic!, privateKey: secrets.vapidPrivate!, subject };
}

export async function sendToSubs(
  store: Store,
  subs: PushSub[],
  payload: PushPayload,
  opts: SendOptions = {},
): Promise<{ sent: number; failed: number }> {
  if (!subs.length) return { sent: 0, failed: 0 };
  const keys = await vapid(store);
  const body = JSON.stringify(payload);
  const dead: PushSub[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
          vapidDetails: keys,
          TTL: opts.ttl ?? 900,
          urgency: opts.urgency ?? "high",
          timeout: 8000,
        });
        sent++;
      } catch (err) {
        failed++;
        // 404/410 mean the browser dropped the subscription: forget it.
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          dead.push(sub);
        }
      }
    }),
  );

  if (dead.length) {
    await store.delMany(
      C.subs,
      dead.map((d) => d.id),
    );
    const remaining = await store.all<PushSub>(C.subs);
    const affected = new Set(dead.map((d) => d.guestId).filter(Boolean) as string[]);
    for (const guestId of affected) {
      if (remaining.some((s) => s.guestId === guestId)) continue;
      const guest = await store.get<Guest>(C.guests, guestId);
      if (guest?.pushEnabled) await store.put(C.guests, { ...guest, pushEnabled: false });
    }
  }
  return { sent, failed };
}

/** Sends to every device a guest has enabled notifications on. Never throws. */
export async function pushToGuests(
  store: Store,
  guestIds: (string | undefined)[],
  payload: PushPayload,
  opts: SendOptions = {},
) {
  try {
    const ids = new Set(guestIds.filter(Boolean) as string[]);
    if (!ids.size) return { sent: 0, failed: 0 };
    const subs = (await store.all<PushSub>(C.subs)).filter((s) => s.guestId && ids.has(s.guestId));
    const res = await sendToSubs(store, subs, payload, opts);
    if (res.sent) await logEvent(store, "push", `Notification sent: “${payload.title}”`);
    return res;
  } catch {
    return { sent: 0, failed: 0 };
  }
}

/** Alerts staff devices (waiter phones, kitchen tablet) that opted in. Never throws. */
export async function pushToStaff(store: Store, roles: StaffRole[], payload: PushPayload) {
  try {
    const subs = (await store.all<PushSub>(C.subs)).filter((s) => s.staff && roles.includes(s.staff));
    return await sendToSubs(store, subs, { ...payload, kind: "staff" }, { ttl: 300, urgency: "high" });
  } catch {
    return { sent: 0, failed: 0 };
  }
}
