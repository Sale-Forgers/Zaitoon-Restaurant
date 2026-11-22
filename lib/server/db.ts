import "server-only";
import { randomBytes } from "node:crypto";
import { billFor, priceLine } from "@/lib/pricing";
import { seedMenu } from "@/lib/seed/menu";
import { startOfDay, weekdayOf } from "@/lib/time";
import type {
  ActivityEvent,
  Campaign,
  Feedback,
  Guest,
  MenuItem,
  Order,
  OrderLine,
  OrderStatus,
  Settings,
  TableDoc,
  Visit,
} from "@/lib/types";
import { getStore, type Store } from "./store";

/** Collection names. */
export const C = {
  settings: "settings",
  secrets: "secrets",
  tables: "tables",
  categories: "categories",
  items: "items",
  guests: "guests",
  subs: "subs",
  visits: "visits",
  orders: "orders",
  calls: "calls",
  feedback: "feedback",
  campaigns: "campaigns",
  events: "events",
  meta: "meta",
} as const;

export interface Secrets {
  id: "main";
  sessionSecret: string;
  vapidPublic?: string;
  vapidPrivate?: string;
}

export const uid = (bytes = 9) => randomBytes(bytes).toString("base64url");

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function tableCode(len = 8) {
  const buf = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

export const DAY = 86_400_000;
export const MIN = 60_000;

// ───────────────────────────── Defaults ─────────────────────────────

export function defaultSettings(): Settings {
  return {
    id: "main",
    restaurant: {
      name: "Zaitoon Family Restaurant",
      tagline: "Thai · Chinese · Continental · Desi",
      address: "Zara Plaza, Basti Bareer, near Shareef Hospital, Main G.T. Road, Wah Cantt",
      phone: "0321 5000193",
      hours: "Open daily, 11:30 AM to 12:00 midnight",
    },
    wifi: {
      enabled: true,
      ssid: "Zaitoon Guest",
      password: "zaitoon2026",
      security: "WPA",
    },
    ordering: { enabled: true, servicePct: 0, taxPct: 0, taxLabel: "GST" },
    kitchen: { autoPrintKot: false, targetMinutes: 20 },
    notifications: { orderUpdates: true, feedbackRequest: true },
    staff: {
      waiters: ["Ali", "Bilal", "Hamza"],
      pins: {
        admin: process.env.ADMIN_PIN || "2580",
        kitchen: process.env.KITCHEN_PIN || "1111",
        waiter: process.env.WAITER_PIN || "2222",
      },
    },
  };
}

function defaultTables(): TableDoc[] {
  const tables: TableDoc[] = [];
  const hall = [4, 4, 4, 6, 6, 4, 4, 8, 6, 4];
  hall.forEach((seats, i) =>
    tables.push({
      id: `t${i + 1}`,
      number: i + 1,
      label: `Table ${i + 1}`,
      zone: "Family Hall",
      seats,
      code: tableCode(),
      active: true,
      visitSeq: 0,
    }),
  );
  const roof = [4, 4, 6, 6, 8, 4];
  roof.forEach((seats, i) =>
    tables.push({
      id: `t${i + 11}`,
      number: i + 11,
      label: `Table ${i + 11}`,
      zone: "Rooftop",
      seats,
      code: tableCode(),
      active: true,
      visitSeq: 0,
    }),
  );
  return tables;
}

// ───────────────────────────── Sample history ─────────────────────────────

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

const SAMPLE_GUESTS: [name: string, phone: string][] = [
  ["Ayesha Khan", "0300 5551234"],
  ["Usman Raza", "0321 5557788"],
  ["Fatima Noor", "0333 5554410"],
  ["Hassan Ali", "0345 5559021"],
  ["Sana Malik", "0312 5556634"],
  ["Bilal Ahmed", "0301 5552290"],
  ["Maryam Tariq", "0334 5558812"],
  ["Imran Sheikh", "0322 5553045"],
  ["Zainab Hussain", "0311 5557156"],
  ["Omar Farooq", "0346 5551967"],
  ["Hira Aslam", "0308 5554478"],
  ["Kamran Yousaf", "0323 5556303"],
];

const SAMPLE_REVIEWS: [food: number, service: number, ambience: number, text: string][] = [
  [5, 5, 5, "Karahi in desi ghee was outstanding. Ordering from the table was so easy."],
  [5, 4, 5, "Rooftop at night is beautiful. Food came faster than usual."],
  [4, 5, 4, "Loved getting a notification when our order was ready. Szechuan chicken is a must."],
  [5, 5, 4, "Kids enjoyed the burgers. Waiter came the moment we tapped the button."],
  [4, 4, 5, "Great family place. BBQ platter was generous."],
  [3, 4, 4, "Food was good but the naan arrived a little late."],
  [5, 5, 5, "Best dining experience in Wah Cantt. Very modern system."],
  [4, 3, 4, "Tasty steaks. It was a busy Saturday so service took a while."],
  [5, 4, 5, "No waiting to place the order, we just scanned and ordered. Mint margarita was perfect."],
  [4, 5, 5, "Cashew nut chicken and chow mein were excellent."],
];

function sampleLines(items: MenuItem[]): OrderLine[] {
  const mains = items.filter((i) =>
    ["thai-chinese", "karahi", "bbq", "burgers", "steaks", "continental", "broast"].includes(i.categoryId),
  );
  const sides = items.filter((i) => ["soups", "starters", "naan"].includes(i.categoryId));
  const drinks = items.filter((i) => ["mocktails", "shakes", "drinks", "tea", "juices"].includes(i.categoryId));
  const popular = items.filter((i) => i.popular);
  const chosen = new Map<string, OrderLine>();
  const take = (item: MenuItem, qty: number) => {
    if (chosen.has(item.id)) return;
    const variantId = item.variants?.length ? pick(item.variants).id : undefined;
    chosen.set(item.id, priceLine(item, { itemId: item.id, qty, variantId }));
  };
  take(Math.random() < 0.55 ? pick(popular) : pick(mains), between(1, 2));
  if (Math.random() < 0.6) take(pick(mains), 1);
  if (Math.random() < 0.55) take(pick(sides), between(1, 3));
  if (Math.random() < 0.7) take(pick(drinks), between(1, 4));
  return [...chosen.values()];
}

interface SampleData {
  guests: Guest[];
  visits: Visit[];
  orders: Order[];
  feedback: Feedback[];
  campaigns: Campaign[];
  events: ActivityEvent[];
}

/** Two weeks of believable trading history so dashboards are not empty in a demo. */
export function buildSampleData(items: MenuItem[], tables: TableDoc[], settings: Settings): SampleData {
  const now = Date.now();
  const guests: Guest[] = SAMPLE_GUESTS.map(([name, phone], i) => ({
    id: `sample-g${i + 1}`,
    token: uid(18),
    name,
    phone,
    marketing: i % 4 !== 3,
    createdAt: now - between(3, 40) * DAY,
    lastSeenAt: now - between(1, 12) * DAY,
    visits: 0,
    orders: 0,
    spent: 0,
    pushEnabled: i % 3 !== 2,
    device: i % 5 === 0 ? "iPhone" : "Android",
    sample: true,
  }));

  const visits: Visit[] = [];
  const orders: Order[] = [];
  let number = 1;

  for (let d = 13; d >= 0; d--) {
    const dayStart = startOfDay(now - d * DAY);
    const weekday = weekdayOf(dayStart);
    const busy = weekday === 5 || weekday === 6 || weekday === 0;
    const count = between(busy ? 12 : 7, busy ? 19 : 12);
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      // Lunch bump around 1–3 pm, dinner peak around 8–10 pm.
      const dinner = Math.random() < 0.68;
      const hour = dinner ? between(19, 22) : between(12, 15);
      const t = dayStart + hour * 3_600_000 + between(0, 59) * MIN;
      // Leave the last hour free so sample tickets never look like live ones.
      if (t < now - 70 * MIN) times.push(t);
    }
    times.sort((a, b) => a - b);

    for (const createdAt of times) {
      const table = pick(tables);
      const guest = Math.random() < 0.6 ? pick(guests) : null;
      const lines = sampleLines(items);
      const subtotal = lines.reduce((a, l) => a + l.total, 0);
      const bill = billFor(subtotal, settings.ordering);
      const prep = between(11, 24);
      const stamps: Partial<Record<OrderStatus, number>> = {
        received: createdAt,
        preparing: createdAt + between(1, 3) * MIN,
        ready: createdAt + prep * MIN,
        picked_up: createdAt + (prep + between(1, 2)) * MIN,
        served: createdAt + (prep + between(2, 4)) * MIN,
      };
      const visitId = `sample-v${number}`;
      visits.push({
        id: visitId,
        tableId: table.id,
        tableNumber: table.number,
        status: "closed",
        openedAt: createdAt - between(2, 6) * MIN,
        closedAt: createdAt + between(45, 80) * MIN,
        closedBy: pick(settings.staff.waiters),
        guestIds: guest ? [guest.id] : [],
        guestNames: guest ? [guest.name] : [],
        total: bill.total,
        sample: true,
      });
      const viaQr = Math.random() < 0.64;
      orders.push({
        id: `sample-o${number}`,
        number,
        visitId,
        tableId: table.id,
        tableNumber: table.number,
        guestId: guest?.id,
        guestName: guest?.name ?? "Walk-in guest",
        source: viaQr ? "qr" : "waiter",
        waiter: viaQr ? undefined : pick(settings.staff.waiters),
        lines,
        status: "served",
        times: stamps,
        subtotal: bill.subtotal,
        service: bill.service,
        tax: bill.tax,
        total: bill.total,
        createdAt,
        updatedAt: stamps.served!,
        kotPrintedAt: createdAt,
        sample: true,
      });
      if (guest) {
        guest.orders += 1;
        guest.spent += bill.total;
        guest.visits += 1;
        guest.lastSeenAt = Math.max(guest.lastSeenAt, createdAt);
        guest.lastTable = table.number;
      }
      number++;
    }
  }

  const feedback: Feedback[] = SAMPLE_REVIEWS.map(([food, service, ambience, comment], i) => {
    const g = guests[i % guests.length];
    return {
      id: `sample-f${i + 1}`,
      guestId: g.id,
      guestName: g.name,
      tableNumber: between(1, tables.length),
      food,
      service,
      ambience,
      comment,
      createdAt: now - (i * 1.3 + 0.2) * DAY,
      sample: true,
    };
  });

  const pushGuests = guests.filter((g) => g.pushEnabled && g.marketing).length;
  const campaigns: Campaign[] = [
    {
      id: "sample-c1",
      title: "Weekend BBQ night at Zaitoon",
      body: "This Saturday on the rooftop: BBQ Mix Platter for 4 with free mint margaritas. Reserve your table!",
      audience: "all",
      sentAt: now - 6 * DAY,
      targeted: pushGuests,
      delivered: pushGuests,
      failed: 0,
      sample: true,
    },
    {
      id: "sample-c2",
      title: "We missed you!",
      body: "Come back this week and enjoy a complimentary soup with any karahi.",
      audience: "recent",
      sentAt: now - 2 * DAY,
      targeted: Math.max(1, pushGuests - 3),
      delivered: Math.max(1, pushGuests - 3),
      failed: 0,
      sample: true,
    },
  ];

  const events: ActivityEvent[] = [
    {
      id: uid(),
      ts: now,
      kind: "system",
      text: "Demo data loaded: real Zaitoon menu, 16 tables and two weeks of sample history.",
    },
  ];

  return { guests, visits, orders, feedback, campaigns, events };
}

// ───────────────────────────── Seeding ─────────────────────────────

async function seedAll(store: Store, withSamples: boolean) {
  const settings = defaultSettings();
  const menu = seedMenu();
  const tables = defaultTables();
  await store.putMany(C.categories, menu.categories);
  await store.putMany(C.items, menu.items);
  await store.putMany(C.tables, tables);
  await store.put<Secrets>(C.secrets, { id: "main", sessionSecret: randomBytes(32).toString("hex") });
  if (withSamples) {
    const s = buildSampleData(menu.items, tables, settings);
    await store.putMany(C.guests, s.guests);
    await store.putMany(C.visits, s.visits);
    await store.putMany(C.orders, s.orders);
    await store.putMany(C.feedback, s.feedback);
    await store.putMany(C.campaigns, s.campaigns);
    await store.putMany(C.events, s.events);
    // Live order numbers continue after the sample ones.
    await store.seq("order", s.orders.length);
  }
  // Settings go last: their presence marks the seed as complete.
  await store.put(C.settings, settings);
}

const g = globalThis as unknown as { __zrSeeded?: Promise<void> };

async function ensureSeeded(store: Store) {
  if (await store.get<Settings>(C.settings, "main")) return;
  const turn = await store.seq("seeded");
  if (turn === 1) {
    await seedAll(store, true);
    return;
  }
  // Another instance is seeding right now: give it a moment.
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await store.get<Settings>(C.settings, "main")) return;
  }
  await seedAll(store, true);
}

/** The store, guaranteed to contain settings, menu and tables. */
export async function db(): Promise<Store> {
  const store = await getStore();
  g.__zrSeeded ??= ensureSeeded(store).catch((err) => {
    g.__zrSeeded = undefined;
    throw err;
  });
  await g.__zrSeeded;
  return store;
}

/** Wipes everything and loads a fresh demo data set. */
export async function resetDemo(withSamples = true) {
  const store = await getStore();
  // Keep the push keys and session secret so signed-in screens and
  // subscribed phones keep working after a reset.
  const secrets = await store.get<Secrets>(C.secrets, "main");
  await store.clear();
  await store.seq("seeded");
  await seedAll(store, withSamples);
  if (secrets) await store.put(C.secrets, secrets);
  g.__zrSeeded = Promise.resolve();
}

export async function getSettings(store: Store): Promise<Settings> {
  const s = await store.get<Settings>(C.settings, "main");
  const d = defaultSettings();
  if (!s) return d;
  // Merge so settings added in newer versions get their defaults.
  return {
    ...d,
    ...s,
    restaurant: { ...d.restaurant, ...s.restaurant },
    wifi: { ...d.wifi, ...s.wifi },
    ordering: { ...d.ordering, ...s.ordering },
    kitchen: { ...d.kitchen, ...s.kitchen },
    notifications: { ...d.notifications, ...s.notifications },
    staff: { waiters: s.staff?.waiters ?? d.staff.waiters, pins: { ...d.staff.pins, ...s.staff?.pins } },
  };
}

export async function getSecrets(store: Store): Promise<Secrets> {
  let s = await store.get<Secrets>(C.secrets, "main");
  if (!s) {
    s = { id: "main", sessionSecret: randomBytes(32).toString("hex") };
    await store.put(C.secrets, s);
  }
  if (process.env.SESSION_SECRET) s = { ...s, sessionSecret: process.env.SESSION_SECRET };
  return s;
}

interface MenuMeta {
  id: "menu";
  rev: number;
}

export async function menuRev(store: Store): Promise<number> {
  return (await store.get<MenuMeta>(C.meta, "menu"))?.rev ?? 1;
}

/** Call after any menu edit so phones and tablets reload the menu. */
export async function bumpMenu(store: Store) {
  await store.put<MenuMeta>(C.meta, { id: "menu", rev: Date.now() });
}

export async function logEvent(
  store: Store,
  kind: ActivityEvent["kind"],
  text: string,
  tableNumber?: number,
) {
  await store.put<ActivityEvent>(C.events, { id: uid(), ts: Date.now(), kind, text, tableNumber });
}
