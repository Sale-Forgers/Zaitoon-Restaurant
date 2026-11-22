"use client";

import { ArrowLeft, Flame, Plus, Search, Send, ShoppingBag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { hasOptions, ItemForm } from "@/components/menu/ItemForm";
import { Badge, Button, Empty, Input, Sheet, Stepper, Textarea, useToast } from "@/components/ui";
import { cartKey, type CartLine } from "@/lib/client/guest";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { cn, rs } from "@/lib/format";
import { lineOptions, priceLine } from "@/lib/pricing";
import type { Menu, MenuItem, OrderLineInput, TableView } from "@/lib/types";

/**
 * Full-screen order taking for the waiter's tablet: menu on the left, the
 * table's order on the right. Sends straight to the kitchen display.
 */
export function OrderPad({ table, menu, onClose }: { table: TableView; menu: Menu; onClose: () => void }) {
  const toast = useToast();
  const [category, setCategory] = useState(menu.categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? menu.items.filter((i) => i.name.toLowerCase().includes(q))
      : menu.items.filter((i) => i.categoryId === category);
  }, [menu, category, query]);

  const priced = useMemo(
    () =>
      lines.flatMap((line) => {
        const item = items.get(line.itemId);
        return item ? [{ line, priced: priceLine(item, line) }] : [];
      }),
    [lines, items],
  );
  const total = priced.reduce((a, p) => a + p.priced.total, 0);
  const count = priced.reduce((a, p) => a + p.priced.qty, 0);
  const countFor = (id: string) => lines.reduce((a, l) => (l.itemId === id ? a + l.qty : a), 0);

  const add = (input: OrderLineInput) => {
    const key = cartKey(input);
    setLines((list) =>
      list.some((l) => l.key === key)
        ? list.map((l) => (l.key === key ? { ...l, qty: Math.min(50, l.qty + input.qty) } : l))
        : [...list, { ...input, key }],
    );
  };
  const setQty = (key: string, qty: number) =>
    setLines((list) => (qty <= 0 ? list.filter((l) => l.key !== key) : list.map((l) => (l.key === key ? { ...l, qty } : l))));

  const send = async () => {
    setBusy(true);
    try {
      const order = await rpc("staff.order.create", {
        tableId: table.id,
        lines: lines.map(({ key: _key, ...rest }) => {
          void _key;
          return rest;
        }),
        note,
        guestName,
      });
      toast({ title: `Order #${order.number} sent to the kitchen`, text: `Table ${table.number} · ${rs(order.total)}` });
      onClose();
    } catch (e) {
      toast({ title: "The order was not sent", text: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const cart = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5">
        {priced.length === 0 ? (
          <Empty icon={<ShoppingBag className="size-6" />} title="No dishes yet" text="Tap dishes on the left to add them to this table's order." />
        ) : (
          <ul className="divide-y divide-ink-900/6">
            {priced.map(({ line, priced: p }) => (
              <li key={line.key} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug font-semibold">{p.name}</p>
                  {lineOptions(p) && <p className="text-[13px] text-ink-400">{lineOptions(p)}</p>}
                  {p.note && <p className="text-[13px] text-ember-600">“{p.note}”</p>}
                  <p className="tabular mt-0.5 text-sm text-ink-500">{rs(p.total)}</p>
                </div>
                <Stepper size="sm" value={line.qty} min={0} onChange={(q) => setQty(line.key, q)} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-3 pb-4">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={40}
            placeholder="Guest name (optional)"
            className="h-11"
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Note for the kitchen (optional)"
            className="min-h-16"
          />
        </div>
      </div>
      <div className="safe-bottom border-t border-ink-900/8 px-5 pt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-500">
            {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="font-display tabular text-2xl font-semibold">{rs(total)}</span>
        </div>
        <Button
          variant="gold"
          size="xl"
          block
          loading={busy}
          disabled={!lines.length}
          icon={<Send className="size-5" />}
          onClick={send}
        >
          Send to kitchen
        </Button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade fixed inset-0 z-40 flex flex-col bg-cream-100 text-ink-900">
      <header className="flex h-16 shrink-0 items-center gap-3 bg-ink-900 px-4 text-sand-50">
        <button
          onClick={onClose}
          aria-label="Back to tables"
          className="flex size-10 items-center justify-center rounded-full bg-white/8 hover:bg-white/15"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight font-semibold">New order · Table {table.number}</h2>
          <p className="truncate text-xs text-sand-500">
            {table.zone} · {table.seats} seats{table.visit?.guestNames.length ? ` · ${table.visit.guestNames.join(", ")}` : ""}
          </p>
        </div>
        <label className="ml-auto hidden h-10 w-64 items-center gap-2 rounded-full bg-white/8 px-3 ring-1 ring-white/10 focus-within:ring-gold-400 sm:flex">
          <Search className="size-4 shrink-0 text-sand-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-sand-500"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear">
              <X className="size-4 text-sand-400" />
            </button>
          )}
        </label>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-0 flex-col">
          <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-ink-900/6 px-4 py-3">
            {menu.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCategory(c.id);
                  setQuery("");
                }}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition",
                  !query && category === c.id ? "bg-ink-900 text-gold-200" : "bg-white text-ink-600 ring-1 ring-ink-900/8",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="mx-4 mt-3 flex h-11 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-ink-900/10 sm:hidden">
            <Search className="size-4 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-28 lg:pb-4">
            {visible.length === 0 ? (
              <Empty icon={<Search className="size-6" />} title="No dishes found" />
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => {
                  const n = countFor(item.id);
                  return (
                    <button
                      key={item.id}
                      disabled={!item.available}
                      onClick={() => (hasOptions(item) ? setSheet(item) : add({ itemId: item.id, qty: 1 }))}
                      className={cn(
                        "flex min-h-[76px] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-soft transition active:scale-[0.98]",
                        n ? "border-gold-400 ring-2 ring-gold-200" : "border-ink-900/6",
                        !item.available && "opacity-50",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[15px] leading-snug font-semibold">
                          <span className="truncate">{item.name}</span>
                          {item.spicy && <Flame className="size-3.5 shrink-0 fill-ember-500 text-ember-500" />}
                        </span>
                        <span className="tabular mt-0.5 block text-sm text-ink-500">
                          {item.variants?.length ? "from " : ""}
                          {rs(item.price)}
                          {item.unit ? ` · ${item.unit}` : ""}
                        </span>
                      </span>
                      {!item.available ? (
                        <Badge>Sold out</Badge>
                      ) : n ? (
                        <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-gold-200">
                          {n}
                        </span>
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-900/5 text-ink-700">
                          <Plus className="size-[18px]" strokeWidth={2.6} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col border-l border-ink-900/8 bg-cream-50 lg:flex">
          <h3 className="font-display px-5 pt-5 pb-2 text-xl font-semibold">Order for Table {table.number}</h3>
          {cart}
        </aside>
      </div>

      {/* Phone and small tablet: the order lives in a bottom bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 px-3 lg:hidden">
        <button
          onClick={() => setCartOpen(true)}
          className="flex h-14 w-full items-center gap-3 rounded-full bg-ink-900 pr-5 pl-2 text-cream-50 shadow-lift"
        >
          <span className="bg-gold-sheen tabular flex size-10 items-center justify-center rounded-full text-sm font-bold text-ink-900">
            {count}
          </span>
          <span className="flex-1 text-left text-[15px] font-semibold">Review order</span>
          <span className="tabular text-[15px] font-bold text-gold-200">{rs(total)}</span>
        </button>
      </div>
      <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title={`Order for Table ${table.number}`} flush>
        <div className="h-[70dvh]">{cart}</div>
      </Sheet>

      <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} flush>
        {sheet && (
          <ItemForm
            key={sheet.id}
            item={sheet}
            onClose={() => setSheet(null)}
            onAdd={(input) => {
              add(input);
              setSheet(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
