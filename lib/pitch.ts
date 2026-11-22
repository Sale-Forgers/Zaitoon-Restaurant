/**
 * Everything the proposal page says: packages, prices, comparison table,
 * add-ons, rollout steps and FAQ. Edit the text here; the page follows.
 *
 * This is the price of the SOFTWARE for the restaurant owner. It has nothing
 * to do with what guests pay for food.
 */

export const CLIENT = {
  name: "Zaitoon Family Restaurant",
  short: "Zaitoon",
  city: "Wah Cantt",
};

export const VENDOR = {
  name: "SaleForgers",
  /** Leave a field empty to hide it. Nothing is shown on the page by default. */
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
  },
};

// ───────────────────────────── Packages ─────────────────────────────

export type TierId = "essential" | "signature" | "royal";

export interface Package {
  id: TierId;
  name: string;
  /** One-time price in US dollars. */
  price: number;
  priceNote: string;
  /** One line: who this package is for. */
  forWhom: string;
  /** Shown above the list, e.g. "Everything in Essential, plus". */
  lead?: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  cta: string;
}

export const PACKAGES: Package[] = [
  {
    id: "essential",
    name: "Essential",
    price: 799,
    priceNote: "one-time",
    forWhom: "Table ordering and a live kitchen screen, ready for service.",
    features: [
      "QR ordering for every table: digital menu with photos, sizes and add-ons",
      "Wi-Fi name and password shown on scan",
      "Live kitchen display with order stages",
      "KOT printing",
      "Call-waiter and bill request buttons",
      "Live order tracking on the guest's phone",
      "Admin panel for menu, prices, sold-out, tables and QR codes",
      "Setup with your full menu",
      "Staff training",
    ],
    cta: "Choose Essential",
  },
  {
    id: "signature",
    name: "Signature",
    price: 1199,
    priceNote: "one-time",
    forWhom: "The complete dine-in experience, from the first scan to the review.",
    lead: "Everything in Essential, plus",
    features: [
      "Push notifications to guests for order updates, with no app",
      "Guest profiles and visit history: name, visits and spend",
      "Waiter tablet app: order taking, table map and alerts",
      "NFC tap tags support",
      "Feedback and ratings after dining",
      "Sales dashboard: revenue, top dishes and busiest hours",
    ],
    highlight: true,
    badge: "Most popular",
    cta: "Choose Signature",
  },
  {
    id: "royal",
    name: "Royal",
    price: 1499,
    priceNote: "one-time",
    forWhom: "For bringing guests back, under your own name and domain.",
    lead: "Everything in Signature, plus",
    features: [
      "Promotional push campaigns to guests at home, with audiences: all, recent or loyal",
      "Push alerts on waiter and kitchen devices",
      "Your own domain and full Zaitoon branding",
      "Custom reports on request",
      "Priority support",
    ],
    cta: "Choose Royal",
  },
];

/** Full comparison table. `from` is the lowest package that includes the feature. */
export interface ComparisonGroup {
  title: string;
  rows: { label: string; from: TierId }[];
}

export const COMPARISON: ComparisonGroup[] = [
  {
    title: "Ordering at the table",
    rows: [
      { label: "QR ordering for every table (photos, sizes, add-ons)", from: "essential" },
      { label: "Wi-Fi name and password shown on scan", from: "essential" },
      { label: "Call-waiter and bill request buttons", from: "essential" },
      { label: "Live order tracking on the guest's phone", from: "essential" },
      { label: "NFC tap tags support", from: "signature" },
    ],
  },
  {
    title: "Kitchen and service",
    rows: [
      { label: "Live kitchen display with order stages", from: "essential" },
      { label: "KOT printing", from: "essential" },
      { label: "Waiter tablet app: order taking, table map, alerts", from: "signature" },
      { label: "Push alerts on waiter and kitchen devices", from: "royal" },
    ],
  },
  {
    title: "Guests and marketing",
    rows: [
      { label: "Push notifications to guests for order updates, no app", from: "signature" },
      { label: "Guest profiles and visit history", from: "signature" },
      { label: "Feedback and ratings after dining", from: "signature" },
      { label: "Promotional push campaigns with audiences", from: "royal" },
    ],
  },
  {
    title: "Management",
    rows: [
      { label: "Admin panel: menu, prices, sold-out, tables, QR codes", from: "essential" },
      { label: "Sales dashboard: revenue, top dishes, busiest hours", from: "signature" },
      { label: "Custom reports on request", from: "royal" },
      { label: "Your own domain and full Zaitoon branding", from: "royal" },
    ],
  },
  {
    title: "Setup and support",
    rows: [
      { label: "Setup with your full menu", from: "essential" },
      { label: "Staff training", from: "essential" },
      { label: "Priority support", from: "royal" },
    ],
  },
];

export const PRICING_NOTES: string[] = [
  "Prices are one-time.",
  "Hardware (tablets, kitchen screen, thermal printer, NFC tags) and hosting or domain are not included.",
  "The add-ons below are optional and quoted separately.",
];

// ───────────────────────────── Add-ons ─────────────────────────────

export type IconKey =
  | "pos"
  | "inventory"
  | "delivery"
  | "payments"
  | "loyalty"
  | "branches"
  | "guest"
  | "kitchen"
  | "waiter"
  | "admin"
  | "push"
  | "crm";

export interface Addon {
  icon: IconKey;
  title: string;
  text: string;
}

/** Optional extras, NOT part of any package above. */
export const ADDONS: Addon[] = [
  {
    icon: "pos",
    title: "POS and billing counter",
    text: "Counter billing and receipts, tied to the same orders the tables create.",
  },
  {
    icon: "inventory",
    title: "Inventory and stock alerts",
    text: "Track ingredients and get a warning before a dish runs out.",
  },
  {
    icon: "delivery",
    title: "Takeaway and delivery",
    text: "Orders for pickup and delivery, with rider tracking.",
  },
  {
    icon: "payments",
    title: "Online payments",
    text: "Let guests settle the bill from their own phone.",
  },
  {
    icon: "loyalty",
    title: "Loyalty points and coupons",
    text: "Reward the families who keep coming back.",
  },
  {
    icon: "branches",
    title: "Multi-branch reporting",
    text: "One dashboard across locations when Zaitoon grows.",
  },
];

// ───────────────────────────── Modules ─────────────────────────────

export interface Module {
  icon: IconKey;
  title: string;
  line: string;
  bullets: string[];
  link: { label: string; href: string };
}

export const MODULES: Module[] = [
  {
    icon: "guest",
    title: "Guest ordering",
    line: "The menu on every table, on the guest's own phone.",
    bullets: [
      "Scan the QR or tap the NFC tag: no app, no login",
      "Photos, sizes, add-ons and a note for the kitchen",
      "Wi-Fi name and password shown on arrival",
      "Live order tracking and one-tap call waiter",
    ],
    link: { label: "Open the Demo Studio", href: "/demo" },
  },
  {
    icon: "kitchen",
    title: "Kitchen display",
    line: "Every order on one screen, the moment it is placed.",
    bullets: [
      "Received → Preparing → Ready → Picked up → Served",
      "A timer on every ticket",
      "KOT printing on 80 mm thermal printers",
      "QR orders and waiter orders in one queue",
    ],
    link: { label: "Open the kitchen display", href: "/kitchen" },
  },
  {
    icon: "waiter",
    title: "Waiter app",
    line: "A tablet in the waiter's hand, in step with the kitchen.",
    bullets: [
      "Takes orders at the table for guests who prefer a waiter",
      "Table map with live states for every table",
      "Alerts when a guest calls or food is ready",
      "Closes the table when the bill is settled",
    ],
    link: { label: "Open the waiter app", href: "/waiter" },
  },
  {
    icon: "admin",
    title: "Admin panel",
    line: "Full control for the manager.",
    bullets: [
      "Edit dishes and prices, mark a dish sold out",
      "Tables, QR codes and guest Wi-Fi",
      "Staff names and a PIN for each role",
      "Sales dashboard: revenue, top dishes, busiest hours",
    ],
    link: { label: "Open the admin panel", href: "/admin" },
  },
  {
    icon: "push",
    title: "Web push notifications",
    line: "Order updates on the lock screen, with no app.",
    bullets: [
      "Preparing, ready, on its way and served",
      "Sent by Zaitoon's own server with its own keys",
      "No SMS or WhatsApp charge per message",
      "Promotions only to guests who opted in",
    ],
    link: { label: "Open notifications in admin", href: "/admin/notifications" },
  },
  {
    icon: "crm",
    title: "Feedback and guest CRM",
    line: "Know who dines with you and how it went.",
    bullets: [
      "Guests enter their name once; the phone remembers them",
      "Visits, orders and spend for every guest",
      "Food, service and ambience ratings after dining",
      "Audiences for offers: all, recent or loyal",
    ],
    link: { label: "Open guests in admin", href: "/admin/guests" },
  },
];

// ───────────────────────────── Guest journey ─────────────────────────────

export interface JourneyStep {
  id: "scan" | "wifi" | "name" | "order" | "updates" | "call" | "after";
  title: string;
  text: string;
}

export const JOURNEY: JourneyStep[] = [
  {
    id: "scan",
    title: "Scan or tap",
    text: "The guest scans the QR code or taps the NFC tag on the table. The menu opens in the phone's browser.",
  },
  {
    id: "wifi",
    title: "Wi-Fi, instantly",
    text: "The guest Wi-Fi name and password appear right away. The manager sets them in the admin panel.",
  },
  {
    id: "name",
    title: "A name, once",
    text: "The guest enters their name the first time. On the next visit the phone remembers them.",
  },
  {
    id: "order",
    title: "Order from the table",
    text: "They browse the menu and place the order. It lands in the kitchen and prints a KOT.",
  },
  {
    id: "updates",
    title: "Live updates",
    text: "Preparing, ready, on its way: each stage arrives as a push notification, with no app.",
  },
  {
    id: "call",
    title: "One-tap service",
    text: "Call the waiter or ask for the bill with one tap. The waiter is alerted on the tablet.",
  },
  {
    id: "after",
    title: "After dinner",
    text: "A quick rating and feedback. Later, offers and promotions reach the guest at home.",
  },
];

// ───────────────────────────── Rollout ─────────────────────────────

export const ROLLOUT: { title: string; text: string }[] = [
  {
    title: "Menu and branding setup",
    text: "Your dishes, prices and logo are loaded and checked with you.",
  },
  {
    title: "Table QR and NFC cards",
    text: "Each table gets its own code, printed and ready to place.",
  },
  {
    title: "Staff training",
    text: "Kitchen, waiters and the manager practise on the real screens.",
  },
  {
    title: "Soft launch",
    text: "Start on a few tables and fine-tune with real guests.",
  },
  {
    title: "Full go-live",
    text: "Every table, with the whole team comfortable on the system.",
  },
];

// ───────────────────────────── FAQ ─────────────────────────────

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Do guests need to install an app?",
    a: "No. Scanning the table QR code or tapping the NFC tag opens the menu in the phone's own browser. Ordering, tracking and calling the waiter all happen there.",
  },
  {
    q: "Will it work on every phone?",
    a: "Ordering and live tracking work in the browser of any modern Android phone or iPhone. Push notifications work straight from the browser on Android. On iPhone, Apple requires the guest to add the page to the Home Screen first. Guests who skip notifications still see every update on the order page.",
  },
  {
    q: "What if a guest does not want to use their phone?",
    a: "The waiter takes the order on the tablet at the table. It goes to the same kitchen display and follows the same stages.",
  },
  {
    q: "Can we change prices or mark a dish sold out ourselves?",
    a: "Yes. The manager edits dishes and prices in the admin panel and can mark any dish sold out. Guests see the change on the menu straight away.",
  },
  {
    q: "Does it need internet?",
    a: "Yes. The system runs online, so the kitchen screen, the waiter tablets and the guests' phones all need a working connection. Guests can use the restaurant Wi-Fi shown when they scan.",
  },
  {
    q: "Which printers work?",
    a: "Any printer the kitchen computer can print to. An 80 mm thermal receipt printer is recommended for kitchen tickets and bills.",
  },
  {
    q: "Can someone order from outside the restaurant?",
    a: "Orders are accepted only from a phone that scanned that table's code in the last few hours, and the manager can issue a new code for any table at any time.",
  },
  {
    q: "Who owns the data?",
    a: "The restaurant. The menu, orders, guest names and feedback belong to Zaitoon.",
  },
  {
    q: "How are notifications sent without WhatsApp or SMS costs?",
    a: "They use Web Push, an open standard built into browsers. Zaitoon's server sends each message with its own keys through the push channel that is already part of the guest's browser. There is no notification vendor in the middle and no charge per message.",
  },
];

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const ORDER: TierId[] = ["essential", "signature", "royal"];
/** True when a package includes a feature that starts at `from`. */
export const includes = (tier: TierId, from: TierId) => ORDER.indexOf(tier) >= ORDER.indexOf(from);
