"use client";

import { ArrowRight, Flame, Plus, ScanLine, Search, ShoppingBag, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dishImage } from "@/components/brand";
import { hasOptions, ItemForm } from "@/components/menu/ItemForm";
import { Badge, Button, Empty, Sheet, Stepper, Textarea, useToast } from "@/components/ui";
import { addToCart, cartCountFor, clearCart, setCartQty } from "@/lib/client/guest";
import { useSlowNow } from "@/lib/client/live";
import { errorMessage, rpc, RpcError } from "@/lib/client/rpc";
import { cn, firstName, rs } from "@/lib/format";
import { billFor, lineOptions } from "@/lib/pricing";
import type { Category, MenuItem } from "@/lib/types";
import { useGuestApp } from "./GuestProvider";

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function MenuView() {
  const { menu, state, table, session, cart, cartCount, cartTotal } = useGuestApp();
  const toast = useToast();
  const now = useSlowNow();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("");
  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const sections = useRef(new Map<string, HTMLElement>());
  const chips = useRef(new Map<string, HTMLElement>());

  const paused = state ? !state.settings.ordering.enabled : false;
  const canOrder = Boolean(table) && !paused;

  const grouped = useMemo(() => {
    if (!menu) return [];
    return menu.categories
      .map((c) => ({ category: c, items: menu.items.filter((i) => i.categoryId === c.id) }))
      .filter((g) => g.items.length);
  }, [menu]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !menu) return null;
    return menu.items.filter((i) => `${i.name} ${i.desc ?? ""}`.toLowerCase().includes(q));
  }, [query, menu]);

  const popular = useMemo(() => (menu?.items ?? []).filter((i) => i.popular && i.image && i.available), [menu]);

  // Highlight the category that is currently under the sticky bar.
  useEffect(() => {
    if (!grouped.length || results) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = grouped[0].category.id;
      for (const g of grouped) {
        const el = sections.current.get(g.category.id);
        if (el && el.getBoundingClientRect().top <= 150) current = g.category.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [grouped, results]);

  useEffect(() => {
    chips.current.get(active)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const blocked = useCallback(() => {
    toast(
      paused
        ? { title: "Ordering is paused", text: "Please ask your waiter to take your order.", tone: "info" }
        : { title: "Scan your table to order", text: "Point your camera at the QR code on your table.", tone: "info" },
    );
  }, [paused, toast]);

  const quickAdd = useCallback(
    (item: MenuItem) => {
      if (!item.available) return;
      if (hasOptions(item)) return setSheet(item);
      if (!canOrder) return blocked();
      addToCart({ itemId: item.id, qty: 1 });
    },
    [canOrder, blocked],
  );

  if (!menu) return <MenuSkeleton />;

  return (
    <div>
      {/* Greeting + search */}
      <section className="bg-ink-sheen px-4 pt-5 pb-6 text-sand-50">
        <p className="text-sm text-sand-400">
          {now ? greeting(now) : "Welcome"}
          {session.name ? `, ${firstName(session.name)}` : ""}
        </p>
        <h1 className="font-display mt-1 text-[28px] leading-[1.1] font-semibold">
          What would you like <span className="text-gold-sheen italic">today?</span>
        </h1>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-full bg-white/[0.08] px-4 ring-1 ring-white/10 focus-within:ring-gold-400">
          <Search className="size-[18px] shrink-0 text-sand-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search karahi, burger, shake…"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-sand-50 outline-none placeholder:text-sand-500"
            enterKeyHint="search"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-sand-400">
              <X className="size-[18px]" />
            </button>
          )}
        </label>
      </section>

      {!table && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-3xl border border-gold-500/30 bg-gold-50 p-4 text-ink-800">
          <ScanLine className="size-6 shrink-0 text-gold-700" />
          <p className="text-sm">
            <span className="font-semibold">You are browsing the menu.</span> Scan the QR code on your table to order from your
            phone.
          </p>
        </div>
      )}
      {table && paused && (
        <div className="mx-4 mt-4 rounded-3xl border border-ember-500/30 bg-ember-50 p-4 text-sm text-ember-700">
          <span className="font-semibold">Ordering from the phone is paused right now.</span> Please ask your waiter, they will
          be happy to take your order.
        </div>
      )}

      {results ? (
        <section className="px-4 pt-5">
          <p className="mb-3 text-sm text-ink-400">
            {results.length} {results.length === 1 ? "dish" : "dishes"} for “{query.trim()}”
          </p>
          {results.length ? (
            <ul className="space-y-3">
              {results.map((item) => (
                <ItemRow key={item.id} item={item} count={cartCountFor(session.cart, item.id)} onOpen={setSheet} onAdd={quickAdd} />
              ))}
            </ul>
          ) : (
            <Empty icon={<Search className="size-6" />} title="Nothing found" text="Try another word, or browse the categories." />
          )}
        </section>
      ) : (
        <>
          {/* Category chips */}
          <div className="sticky top-[57px] z-20 border-b border-ink-900/6 bg-cream-100/95 backdrop-blur">
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
              {grouped.map(({ category }) => (
                <button
                  key={category.id}
                  ref={(el) => {
                    if (el) chips.current.set(category.id, el);
                    else chips.current.delete(category.id);
                  }}
                  onClick={() => sections.current.get(category.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition",
                    active === category.id
                      ? "bg-ink-900 text-gold-200 shadow-soft"
                      : "bg-white text-ink-600 ring-1 ring-ink-900/8",
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* House favourites */}
          {popular.length > 0 && (
            <section className="pt-5">
              <div className="flex items-end justify-between px-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-700 uppercase">House favourites</p>
                  <h2 className="font-display text-2xl font-semibold">Loved at Zaitoon</h2>
                </div>
                <Star className="mb-1 size-5 fill-gold-400 text-gold-400" />
              </div>
              <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {popular.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSheet(item)}
                    className="group relative h-[188px] w-[236px] shrink-0 snap-start overflow-hidden rounded-[28px] text-left shadow-lift"
                  >
                    <img
                      src={dishImage(item.image)}
                      alt={item.name}
                      width={900}
                      height={675}
                      className="absolute inset-0 size-full object-cover transition duration-500 group-active:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/25 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-4 text-sand-50">
                      <span className="font-display block text-lg leading-tight font-semibold">{item.name}</span>
                      <span className="tabular mt-1 block text-sm font-semibold text-gold-300">
                        {item.variants?.length ? "from " : ""}
                        {rs(item.price)}
                      </span>
                    </span>
                    <span className="bg-gold-sheen absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-ink-900 shadow-gold">
                      <Plus className="size-5" strokeWidth={2.6} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Full menu */}
          {grouped.map(({ category, items }) => (
            <CategorySection
              key={category.id}
              category={category}
              register={(el) => {
                if (el) sections.current.set(category.id, el);
                else sections.current.delete(category.id);
              }}
            >
              {items.map((item) => (
                <ItemRow key={item.id} item={item} count={cartCountFor(session.cart, item.id)} onOpen={setSheet} onAdd={quickAdd} />
              ))}
            </CategorySection>
          ))}
          <p className="px-6 pt-8 pb-2 text-center text-xs text-ink-300">
            Prices are in Pakistani rupees. Please tell your waiter about any allergies.
          </p>
        </>
      )}

      {/* Cart bar */}
      {cartCount > 0 && canOrder && (
        <div className="pointer-events-none fixed bottom-[calc(4.6rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-3">
          <button
            onClick={() => setCartOpen(true)}
            className="animate-rise pointer-events-auto flex h-14 w-full items-center gap-3 rounded-full bg-ink-900 pr-5 pl-2 text-cream-50 shadow-lift"
          >
            <span className="bg-gold-sheen tabular flex size-10 items-center justify-center rounded-full text-sm font-bold text-ink-900">
              {cartCount}
            </span>
            <span className="flex-1 text-left text-[15px] font-semibold">View your order</span>
            <span className="tabular text-[15px] font-bold text-gold-200">{rs(cartTotal)}</span>
            <ArrowRight className="size-4 text-gold-300" />
          </button>
        </div>
      )}

      <ItemSheet item={sheet} onClose={() => setSheet(null)} canOrder={canOrder} onBlocked={blocked} />
      <CartSheet open={cartOpen && cart.length > 0} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function CategorySection({
  category,
  register,
  children,
}: {
  category: Category;
  register: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section ref={register} className="scroll-mt-[122px] px-4 pt-7">
      <h2 className="font-display text-2xl font-semibold">{category.name}</h2>
      {category.blurb && <p className="mt-0.5 text-[13px] text-ink-400">{category.blurb}</p>}
      <ul className="mt-3 space-y-3">{children}</ul>
    </section>
  );
}

function ItemRow({
  item,
  count,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  count: number;
  onOpen: (i: MenuItem) => void;
  onAdd: (i: MenuItem) => void;
}) {
  const img = dishImage(item.image, true);
  const add = (
    <button
      onClick={() => onAdd(item)}
      aria-label={`Add ${item.name}`}
      className={cn(
        "tabular flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-soft transition active:scale-90",
        count ? "bg-ink-900 text-gold-200" : "bg-white text-ink-900 ring-1 ring-ink-900/10",
      )}
    >
      {count ? count : <Plus className="size-[18px]" strokeWidth={2.6} />}
    </button>
  );

  return (
    <li
      className={cn(
        "flex items-stretch gap-3 rounded-3xl border border-ink-900/5 bg-white p-3 shadow-soft",
        !item.available && "opacity-60",
      )}
    >
      <button onClick={() => onOpen(item)} className="min-w-0 flex-1 py-0.5 pl-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] leading-snug font-semibold">{item.name}</span>
          {item.spicy && <Flame className="size-3.5 shrink-0 fill-ember-500 text-ember-500" aria-label="Spicy" />}
          {item.popular && <Badge tone="gold">Popular</Badge>}
        </span>
        {item.unit && <span className="mt-0.5 block text-xs font-medium text-ink-400">{item.unit}</span>}
        {item.desc && <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-400">{item.desc}</span>}
        <span className="tabular mt-2 block text-[15px] font-bold">
          {item.variants?.length ? <span className="text-xs font-semibold text-ink-400">from </span> : null}
          {rs(item.price)}
        </span>
      </button>

      {img ? (
        <div className="relative shrink-0 self-center">
          <button onClick={() => onOpen(item)} aria-label={`View ${item.name}`} className="block">
            <img
              src={img}
              alt=""
              width={320}
              height={320}
              loading="lazy"
              decoding="async"
              className="size-[92px] rounded-[20px] object-cover"
            />
          </button>
          <div className="absolute -right-1 -bottom-2">{item.available ? add : null}</div>
        </div>
      ) : (
        <div className="flex shrink-0 items-center pr-1">{item.available ? add : null}</div>
      )}
      {!item.available && (
        <div className="flex shrink-0 items-center">
          <Badge tone="neutral">Sold out</Badge>
        </div>
      )}
    </li>
  );
}

// ───────────────────────────── Dish sheet ─────────────────────────────

function ItemSheet({
  item,
  onClose,
  canOrder,
  onBlocked,
}: {
  item: MenuItem | null;
  onClose: () => void;
  canOrder: boolean;
  onBlocked: () => void;
}) {
  const toast = useToast();
  return (
    <Sheet open={Boolean(item)} onClose={onClose} flush>
      {item && (
        <ItemForm
          key={item.id}
          item={item}
          onClose={onClose}
          blocked={canOrder ? undefined : "Scan your table to order"}
          onAdd={(input) => {
            if (!canOrder) return onBlocked();
            addToCart(input);
            toast({ title: `${input.qty} × ${item.name} added`, text: "Tap “View your order” when you are ready." });
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

// ───────────────────────────── Cart ─────────────────────────────

function CartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, cartTotal, table, state, refresh } = useGuestApp();
  const toast = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const bill = billFor(cartTotal, state?.settings.ordering ?? { servicePct: 0, taxPct: 0, taxLabel: "Tax" });

  const place = async () => {
    if (!table) return;
    setBusy(true);
    try {
      const { order } = await rpc("guest.order", {
        code: table.code,
        lines: cart.map(({ line }) => ({
          itemId: line.itemId,
          qty: line.qty,
          variantId: line.variantId,
          choices: line.choices,
          extraIds: line.extraIds,
          note: line.note,
        })),
        note,
      });
      clearCart();
      setNote("");
      onClose();
      toast({ title: `Order #${order.number} sent to the kitchen`, text: "You can follow it live on the next screen." });
      await refresh();
      router.push("/orders");
    } catch (e) {
      if (e instanceof RpcError && e.code === "RESCAN") {
        toast({ title: "Please scan your table again", text: e.message, tone: "error" });
      } else {
        toast({ title: "Your order was not sent", text: errorMessage(e), tone: "error" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <ShoppingBag className="size-5 text-gold-600" /> Your order
          {table && <Badge tone="dark">Table {table.number}</Badge>}
        </span>
      }
      footer={
        <div>
          <div className="mb-3 space-y-1 text-sm">
            {(bill.service > 0 || bill.tax > 0) && (
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span className="tabular">{rs(bill.subtotal)}</span>
              </div>
            )}
            {bill.service > 0 && (
              <div className="flex justify-between text-ink-500">
                <span>Service charge ({bill.servicePct}%)</span>
                <span className="tabular">{rs(bill.service)}</span>
              </div>
            )}
            {bill.tax > 0 && (
              <div className="flex justify-between text-ink-500">
                <span>
                  {bill.taxLabel} ({bill.taxPct}%)
                </span>
                <span className="tabular">{rs(bill.tax)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display tabular text-2xl font-semibold">{rs(bill.total)}</span>
            </div>
          </div>
          <Button variant="gold" size="xl" block loading={busy} onClick={place}>
            Send order to kitchen
          </Button>
          <p className="mt-2 text-center text-xs text-ink-400">Pay at the end of your meal, as always.</p>
        </div>
      }
    >
      <ul className="divide-y divide-ink-900/6">
        {cart.map(({ line, priced }) => (
          <li key={line.key} className="flex items-start gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-snug font-semibold">{priced.name}</p>
              {lineOptions(priced) && <p className="mt-0.5 text-[13px] text-ink-400">{lineOptions(priced)}</p>}
              {priced.note && <p className="mt-0.5 text-[13px] text-ember-600">“{priced.note}”</p>}
              <p className="tabular mt-1 text-sm font-semibold text-ink-600">{rs(priced.total)}</p>
            </div>
            <Stepper
              size="sm"
              value={line.qty}
              min={0}
              onChange={(q) => {
                setCartQty(line.key, q);
                // Removing the last dish closes the sheet.
                if (q <= 0 && cart.length === 1) onClose();
              }}
            />
          </li>
        ))}
      </ul>
      <label className="mt-3 block">
        <span className="mb-2 block text-[13px] font-semibold text-ink-600">Note for the kitchen (optional)</span>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Anything we should know? e.g. serve the soup first"
          className="min-h-20"
        />
      </label>
    </Sheet>
  );
}

function MenuSkeleton() {
  return (
    <div>
      <div className="bg-ink-sheen h-[172px]" />
      <div className="space-y-3 px-4 pt-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-[116px] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
