"use client";

import { rpc } from "./rpc";

/**
 * Browser side of Web Push. Uses only standard web APIs (Service Worker,
 * Push API, Notifications API): there is no app to install and no third-party
 * notification service in the middle.
 */

export type PushState =
  | "enabled" // subscribed on this device
  | "ready" // supported, not asked yet
  | "denied" // the guest blocked notifications in the browser
  | "ios-install" // iPhone/iPad: needs "Add to Home Screen" first (Apple's rule)
  | "insecure" // not https (push needs a secure address)
  | "unsupported";

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function toBytes(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = window.atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  registration ??= navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => {
      registration = null;
      return null;
    });
  return registration;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") {
    const reg = await registerSW();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "enabled" : "ready";
  }
  return "ready";
}

/**
 * Asks for permission (must be called from a tap) and registers this device
 * with the server. Returns the resulting state.
 */
export async function enablePush(opts: { staff?: boolean } = {}): Promise<PushState> {
  const state = await getPushState();
  if (state !== "ready" && state !== "enabled") return state;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "ready";

  const reg = await registerSW();
  if (!reg) return "unsupported";
  const { key } = await rpc("push.key");
  const appKey = toBytes(key);

  let sub = await reg.pushManager.getSubscription();
  // A subscription made with older keys cannot receive our messages: renew it.
  if (sub && !sameKey(sub.options.applicationServerKey, appKey)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });

  const json = sub.toJSON();
  await rpc("push.subscribe", {
    sub: { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } },
    staff: opts.staff,
  });
  return "enabled";
}

/** Re-sends an existing subscription to the server (cheap, safe to call on every visit). */
export async function syncPush(): Promise<void> {
  try {
    if (typeof window === "undefined" || !window.isSecureContext) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    await enablePush();
  } catch {
    /* never block the page on this */
  }
}

export async function disablePush(): Promise<void> {
  const reg = await registerSW();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  try {
    await rpc("push.unsubscribe", { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe();
  }
}
