import type { CallType, OrderStatus, TableState } from "@/lib/types";

export const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

export const num = (n: number) => Math.round(n).toLocaleString("en-PK");

export function clock(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(ts: number) {
  return new Date(ts).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export function dateTime(ts: number) {
  return `${dayLabel(ts)}, ${clock(ts)}`;
}

export function ago(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 1) return "1 min ago";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** mm:ss (or h:mm:ss) since a timestamp: used for kitchen ticket timers. */
export function elapsed(since: number, now: number) {
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked up",
  served: "Served",
  cancelled: "Cancelled",
};

/** How each step reads on the guest's phone. */
export const STATUS_GUEST: Record<OrderStatus, { title: string; text: string }> = {
  received: { title: "Order received", text: "The kitchen has your order." },
  preparing: { title: "Being prepared", text: "Our chefs are cooking your food." },
  ready: { title: "Ready in the kitchen", text: "Your waiter is collecting it now." },
  picked_up: { title: "On its way", text: "Your waiter is bringing it to your table." },
  served: { title: "Served", text: "Enjoy your meal!" },
  cancelled: { title: "Cancelled", text: "This order was cancelled." },
};

export const CALL_LABEL: Record<CallType, string> = {
  waiter: "Call waiter",
  bill: "Bring the bill",
  water: "Water, please",
  cutlery: "Cutlery / plates",
  other: "Something else",
};

export const CALL_SHORT: Record<CallType, string> = {
  waiter: "Waiter needed",
  bill: "Bill requested",
  water: "Water",
  cutlery: "Cutlery",
  other: "Assistance",
};

export const TABLE_STATE_LABEL: Record<TableState, string> = {
  free: "Free",
  seated: "Seated",
  cooking: "In kitchen",
  ready: "Ready to serve",
  calling: "Calling",
  bill: "Bill requested",
};

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Wi-Fi QR payload understood by Android and iOS cameras. */
export function wifiQr(ssid: string, password: string, security: "WPA" | "WEP" | "nopass") {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return security === "nopass"
    ? `WIFI:T:nopass;S:${esc(ssid)};;`
    : `WIFI:T:${security};S:${esc(ssid)};P:${esc(password)};;`;
}
