/**
 * Shared data model for the Zaitoon Smart Dining system.
 * Every record is a plain JSON document so it can live in the local file store
 * or in a Postgres JSONB column without a mapping layer.
 */

// ───────────────────────────── Menu ─────────────────────────────

export interface Variant {
  id: string;
  name: string;
  price: number;
}

/** A required single choice that does not change the price (sauce, spice level…). */
export interface ChoiceGroup {
  id: string;
  name: string;
  options: string[];
}

/** An optional paid add-on. */
export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  sort: number;
  blurb?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  desc?: string;
  /** Base price. When variants exist this is the lowest variant price. */
  price: number;
  /** Image slug under /images/dishes (without extension). */
  image?: string;
  popular?: boolean;
  spicy?: boolean;
  /** Small note shown next to the name, e.g. "4 pcs" or "Serves 2". */
  unit?: string;
  available: boolean;
  sort: number;
  variants?: Variant[];
  choices?: ChoiceGroup[];
  extras?: Extra[];
}

export interface Menu {
  categories: Category[];
  items: MenuItem[];
}

// ───────────────────────────── Floor ─────────────────────────────

export interface TableDoc {
  id: string;
  number: number;
  label: string;
  zone: string;
  seats: number;
  /** Secret token printed in the table's QR code / NFC tag. */
  code: string;
  active: boolean;
  /** Incremented every time a visit on this table is closed. */
  visitSeq: number;
}

export interface Visit {
  id: string;
  tableId: string;
  tableNumber: number;
  status: "open" | "closed";
  openedAt: number;
  closedAt?: number;
  closedBy?: string;
  guestIds: string[];
  guestNames: string[];
  billRequested?: boolean;
  total?: number;
  sample?: boolean;
}

// ───────────────────────────── Guests ─────────────────────────────

export interface Guest {
  id: string;
  /** Device secret. Never sent to staff screens. */
  token: string;
  name: string;
  phone?: string;
  /** Agreed to receive offers. */
  marketing: boolean;
  createdAt: number;
  lastSeenAt: number;
  visits: number;
  orders: number;
  spent: number;
  pushEnabled: boolean;
  lastTable?: number;
  /** Last table this phone scanned, and when: ordering needs a recent scan. */
  scanTableId?: string;
  scanAt?: number;
  device?: string;
  sample?: boolean;
}

export type GuestPublic = Omit<Guest, "token">;

export interface PushSub {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  guestId?: string;
  staff?: StaffRole;
  createdAt: number;
  ua?: string;
}

// ───────────────────────────── Orders ─────────────────────────────

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "picked_up"
  | "served"
  | "cancelled";

export const ORDER_FLOW: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "picked_up",
  "served",
];

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  variant?: string;
  choices?: string[];
  extras?: { name: string; price: number }[];
  note?: string;
  total: number;
}

export interface Order {
  id: string;
  number: number;
  visitId: string;
  tableId: string;
  tableNumber: number;
  guestId?: string;
  guestName: string;
  source: "qr" | "waiter";
  waiter?: string;
  lines: OrderLine[];
  note?: string;
  status: OrderStatus;
  times: Partial<Record<OrderStatus, number>>;
  subtotal: number;
  service: number;
  tax: number;
  total: number;
  createdAt: number;
  updatedAt: number;
  kotPrintedAt?: number;
  sample?: boolean;
}

/** What the guest sends when ordering; prices are always recomputed on the server. */
export interface OrderLineInput {
  itemId: string;
  qty: number;
  variantId?: string;
  choices?: string[];
  extraIds?: string[];
  note?: string;
}

// ───────────────────────────── Service ─────────────────────────────

export type CallType = "waiter" | "bill" | "water" | "cutlery" | "other";

export interface WaiterCall {
  id: string;
  tableId: string;
  tableNumber: number;
  visitId?: string;
  guestId?: string;
  guestName: string;
  type: CallType;
  note?: string;
  status: "open" | "ack" | "done";
  origin: "guest" | "kitchen" | "admin";
  createdAt: number;
  ackAt?: number;
  ackBy?: string;
  doneAt?: number;
}

export interface Feedback {
  id: string;
  visitId?: string;
  guestId?: string;
  guestName: string;
  tableNumber?: number;
  food: number;
  service: number;
  ambience: number;
  comment?: string;
  createdAt: number;
  sample?: boolean;
}

export type Audience = "all" | "recent" | "loyal";

export interface Campaign {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  sentAt: number;
  targeted: number;
  delivered: number;
  failed: number;
  sample?: boolean;
}

export type EventKind =
  | "order"
  | "status"
  | "call"
  | "guest"
  | "feedback"
  | "push"
  | "visit"
  | "system";

/** Activity feed entry shown on the admin dashboard. */
export interface ActivityEvent {
  id: string;
  ts: number;
  kind: EventKind;
  text: string;
  tableNumber?: number;
}

// ───────────────────────────── Staff & settings ─────────────────────────────

export type StaffRole = "admin" | "kitchen" | "waiter";

export interface StaffSession {
  role: StaffRole;
  name: string;
}

export interface Settings {
  id: "main";
  restaurant: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    hours: string;
  };
  wifi: {
    enabled: boolean;
    ssid: string;
    password: string;
    security: "WPA" | "WEP" | "nopass";
  };
  ordering: {
    enabled: boolean;
    servicePct: number;
    taxPct: number;
    taxLabel: string;
  };
  kitchen: {
    autoPrintKot: boolean;
    /** Tickets older than this are highlighted as late on the kitchen display. */
    targetMinutes: number;
  };
  notifications: {
    orderUpdates: boolean;
    feedbackRequest: boolean;
  };
  staff: {
    waiters: string[];
    pins: Record<StaffRole, string>;
  };
  /** Optional public address used in QR codes instead of the browser's origin. */
  baseUrl?: string;
}

/** Settings with staff PINs removed: safe for any staff screen. */
export type StaffSettings = Omit<Settings, "staff"> & { staff: { waiters: string[] } };

/** The subset a guest's phone is allowed to see. */
export interface GuestSettings {
  restaurant: Settings["restaurant"];
  wifi: Settings["wifi"];
  ordering: Settings["ordering"];
}

// ───────────────────────────── View models ─────────────────────────────

export interface Bill {
  subtotal: number;
  service: number;
  tax: number;
  total: number;
  servicePct: number;
  taxPct: number;
  taxLabel: string;
}

export interface GuestState {
  table: { id: string; number: number; label: string; zone: string };
  guest: GuestPublic | null;
  settings: GuestSettings;
  visit: {
    id: string;
    openedAt: number;
    guestNames: string[];
    billRequested: boolean;
  } | null;
  orders: Order[];
  calls: WaiterCall[];
  bill: Bill;
  /** A finished visit this guest has not rated yet. */
  pendingFeedback: { visitId: string; tableNumber: number; closedAt: number } | null;
  feedbackGiven: boolean;
  /** This guest's visit that was closed in the last few hours, if any. */
  recentVisit: { tableNumber: number; closedAt: number; total: number } | null;
  /** Changes whenever the menu is edited, so phones know to reload it. */
  menuRev: number;
}

export type TableState =
  | "free"
  | "seated"
  | "cooking"
  | "ready"
  | "calling"
  | "bill";

export interface TableView extends TableDoc {
  state: TableState;
  visit: Visit | null;
  activeOrders: number;
  openTotal: number;
}

export interface StaffBoard {
  now: number;
  orders: Order[];
  tables: TableView[];
  calls: WaiterCall[];
  settings: StaffSettings;
  menuRev: number;
  /** False when the server has no durable database configured. */
  durable: boolean;
}

export interface AdminOverview {
  today: {
    revenue: number;
    orders: number;
    avgTicket: number;
    avgPrepMin: number | null;
    activeTables: number;
    totalTables: number;
    openCalls: number;
    inKitchen: number;
  };
  guests: { total: number; push: number; returning: number };
  rating: { avg: number | null; count: number };
  series: { day: string; label: string; revenue: number; orders: number }[];
  hours: { hour: number; orders: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  sources: { qr: number; waiter: number };
  events: ActivityEvent[];
  durable: boolean;
  storage: string;
}
