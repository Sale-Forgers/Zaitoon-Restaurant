# Zaitoon Smart Dining

A working demonstration of a smart dining system for **Zaitoon Family Restaurant** (Wah Cantt), built to be shown to the restaurant owner. One web app covers the whole dine-in floor:

| Screen | Address | Who uses it |
| --- | --- | --- |
| Pitch page with pricing | `/` | Shown to the client in the meeting |
| Demo studio (phone + kitchen + waiter side by side) | `/demo` | The presenter |
| Guest app | `/t/<table code>` → `/menu`, `/orders`, `/offers` | Guests, on their own phone |
| Kitchen display | `/kitchen` | Kitchen team (wall screen or tablet) |
| Waiter app | `/waiter` | Waiters (tablet or phone) |
| Admin panel | `/admin` | Manager / owner |

## What a guest experiences

1. Scans the QR code on the table (or taps the NFC tag). No app to install.
2. Sees the Wi-Fi name and password, set by the manager.
3. Enters their name once. The phone is remembered on the next visit.
4. Can switch on notifications (standard Web Push, no third-party service).
5. Orders from the real Zaitoon menu. The order appears in the kitchen within a second and can print a KOT.
6. Follows the order live: Received → Preparing → Ready → On its way → Served, with a notification at each step, even when the phone is locked.
7. Calls the waiter or asks for the bill with one tap.
8. Rates the visit after dinner. Later, offers sent from the admin panel reach the phone at home.

## Run it on your computer

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database or keys are needed: data is stored in `.data/zaitoon-data.json`, and the first start loads the real menu, 16 tables and two weeks of sample history.

For a presentation, the production build is faster and has no development overlay:

```bash
npm run demo
```

Staff screens ask for a PIN (the PIN pad shows it as a hint only under `npm run dev` on localhost):

| Role | Default PIN |
| --- | --- |
| Admin | `2580` |
| Kitchen | `1111` |
| Waiter | `2222` |

Change them in Admin → Settings, or set `ADMIN_PIN`, `KITCHEN_PIN`, `WAITER_PIN` before the first start.

## A five-minute demo script

1. Open `/demo`. Sign in to the kitchen and waiter panes with their PINs.
2. In the phone pane enter a name and continue to the menu.
3. Add a few dishes and send the order. The ticket appears on the kitchen display with a chime.
4. On the kitchen display press **Start preparing**, then **Mark ready**. The phone updates each time.
5. In the waiter pane press **Pick up**, then **Mark served**. The phone asks for a rating.
6. On the phone press **Call waiter**. The table turns red in the waiter pane; press **On my way**.
7. In the waiter pane open a table, press **Take order** and send an order from the tablet.
8. Open `/admin` to show the dashboard, QR codes and Wi-Fi, the menu manager (mark a dish sold out and watch it change on the phone), guests, and push campaigns.

Admin → Dashboard has demo tools: simulate an order, simulate a waiter call, and reset the demo data. Reset before a meeting so the sample history is fresh.

## Showing it on a real phone

Notifications and the service worker need a secure address (https). `localhost` counts as secure, but a phone cannot open your computer's `localhost`. Two options:

- **Deploy it** (recommended, see below). The QR codes in Admin → Tables then work on any phone.
- **Same Wi-Fi without https**: start with `npm run demo`, open the admin panel through your computer's network address (for example `http://192.168.1.20:3000/admin`) and scan a table QR. Everything works except notifications.

## Deploy to Vercel

1. Import this repository in Vercel (framework: Next.js, no settings to change).
2. Add a Postgres database: in the Vercel project open **Storage → Create Database** and choose Neon or Supabase. This adds `DATABASE_URL` / `POSTGRES_URL` to the project automatically. Any other Postgres connection string in `DATABASE_URL` works too.
3. Redeploy. The first request creates two small tables (`zr_docs`, `zr_meta`) and loads the demo data.

Without a database the app still starts on Vercel, but data is temporary; the admin dashboard shows a warning.

### Environment variables (all optional)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` or `POSTGRES_URL` | Postgres connection string. When missing, a local JSON file is used. |
| `DATABASE_SSL` | `strict` to verify the database certificate, `off` to disable TLS. Default: TLS without verification for hosted databases (needed for Supabase). |
| `DATABASE_POOL_MAX` | Database connections kept per server instance. Default: 3. |
| `ADMIN_PIN`, `KITCHEN_PIN`, `WAITER_PIN` | Initial staff PINs (4 to 6 digits). Set your own for a public address. |
| `SESSION_SECRET` | Secret for signing staff sessions. Generated and stored automatically when missing. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push keys. Generated and stored automatically when missing. |
| `VAPID_SUBJECT` | Contact URL sent to push services. Default: the restaurant's website. |
| `DATA_DIR` | Folder for the local JSON store. Default: `.data`. |
| `DEMO_MODE` | `off` stops the pitch page and demo studio from showing scannable table codes. |

## How notifications work

The system uses the open **Web Push** standard with its own VAPID key pair (`lib/server/push.ts`, `public/sw.js`). The server encrypts each message and sends it to the push endpoint the guest's browser handed over when they tapped "Turn on notifications". There is no Firebase project, OneSignal account, SMS or WhatsApp API involved.

- Android (Chrome, Samsung Internet, Firefox) and desktop browsers: works straight from the browser.
- iPhone and iPad: Apple only delivers web notifications to sites added to the Home Screen (iOS 16.4+). The guest app explains this step where it applies.
- Staff devices can opt in as well ("Turn on alerts" in the waiter app) to hear about guest calls and ready orders with the screen off.

## Printing

Kitchen tickets (KOT) and bills are laid out for 80 mm thermal printers and printed by the browser. The kitchen display can print every new order automatically. To print without the print dialog, start Chrome on the kitchen computer with `--kiosk-printing` and set the thermal printer as the default printer.

## How it is built

- **Next.js 16** (App Router, React 19, TypeScript) and **Tailwind CSS 4**.
- **One API endpoint** (`app/api/rpc/route.ts`) dispatching to typed handlers in `lib/server/rpc.ts`. Business rules live in `lib/server/logic.ts`.
- **Storage** (`lib/server/store.ts`): a small document store with two drivers, a JSON file for local runs and Postgres (one JSONB table) for hosting.
- **Live updates** (`lib/client/live.ts`): every write bumps a version number; screens check it about once a second and reload only when it changes. Tabs in the same browser also notify each other instantly. This works on serverless hosting without websockets.
- **Guest identity** (`lib/client/guest.ts`): an id and secret token in the phone's local storage. Orders are accepted only from a phone that scanned the table in the last six hours.
- **Staff access**: PIN login, signed http-only cookie, role checks on every request.

```
app/            routes (pitch page, guest app, kitchen, waiter, admin, API)
components/     ui primitives, guest, staff, admin, pitch and print components
lib/client/     browser helpers: rpc, live sync, guest session, push, sound
lib/server/     store, seed data, business logic, push sending, auth, rpc handlers
lib/seed/       the Zaitoon menu
lib/pitch.ts    packages, prices and FAQ shown on the pitch page
public/         logo, icons, photos, service worker
```

## Data notes

- The menu (names, descriptions, prices) was taken from zaitoonfamilyrestaurant.com in November 2026 and is editable in Admin → Menu. A few prices on the restaurant's site look inconsistent (broast sizes, and shakes listed at two prices); confirm them with the restaurant.
- Photos named after dishes are Zaitoon's own where available. The remaining dish photos are placeholders carried over from the first draft and should be replaced with the restaurant's photos before going live.
- Wi-Fi name and password, table count, waiter names, guests, orders, reviews and campaigns marked "Sample" are demo data.
- Package names, prices and the feature split on the pitch page are defined in `lib/pitch.ts`.
