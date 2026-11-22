"use client";

import { Check, Flame, X } from "lucide-react";
import { useState } from "react";
import { dishImage } from "@/components/brand";
import { Badge, Button, Stepper } from "@/components/ui";
import { cn, rs } from "@/lib/format";
import { priceLine } from "@/lib/pricing";
import type { MenuItem, OrderLineInput } from "@/lib/types";

export const hasOptions = (i: MenuItem) => Boolean(i.variants?.length || i.choices?.length || i.extras?.length);

/**
 * The dish detail form: size/protein, required choices, paid extras, a note
 * and quantity. Used by the guest's phone and by the waiter's order pad.
 */
export function ItemForm({
  item,
  onClose,
  onAdd,
  blocked,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (input: OrderLineInput) => void;
  /** When set, ordering is not possible and this text replaces the button label. */
  blocked?: string;
}) {
  const [variantId, setVariantId] = useState(item.variants?.[0]?.id);
  const [choices, setChoices] = useState<string[]>(() => (item.choices ?? []).map((g) => g.options[0]));
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const input: OrderLineInput = { itemId: item.id, qty, variantId, choices, extraIds, note };
  const priced = priceLine(item, input);
  const img = dishImage(item.image);

  const add = () => {
    onAdd({
      itemId: item.id,
      qty,
      variantId,
      choices: choices.length ? choices : undefined,
      extraIds: extraIds.length ? extraIds : undefined,
      note: note.trim() || undefined,
    });
  };
  return (
    <div>
      <div className="relative">
        {img ? (
          <img src={img} alt={item.name} width={900} height={675} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="bg-ink-sheen h-20" />
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-[26px] leading-tight font-semibold">{item.name}</h2>
          <p className="tabular pt-1.5 text-lg font-bold whitespace-nowrap">{rs(priced.unitPrice)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.unit && <Badge>{item.unit}</Badge>}
          {item.popular && <Badge tone="gold">Popular</Badge>}
          {item.spicy && (
            <Badge tone="ember">
              <Flame className="size-3 fill-current" /> Spicy
            </Badge>
          )}
        </div>
        {item.desc && <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{item.desc}</p>}

        {item.variants && item.variants.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-2 text-[13px] font-semibold tracking-wide text-ink-400 uppercase">Choose one</legend>
            <div className="space-y-2">
              {item.variants.map((v) => {
                const on = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
                      on ? "border-ink-900 bg-ink-900 text-cream-50" : "border-ink-900/10 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        on ? "border-gold-300 bg-gold-300 text-ink-900" : "border-ink-900/25",
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={4} />}
                    </span>
                    <span className="flex-1 text-[15px] font-semibold">{v.name}</span>
                    <span className={cn("tabular text-[15px] font-semibold", on ? "text-gold-200" : "text-ink-600")}>{rs(v.price)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {item.choices?.map((group, gi) => (
          <fieldset key={group.id} className="mt-6">
            <legend className="mb-2 text-[13px] font-semibold tracking-wide text-ink-400 uppercase">{group.name}</legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((o) => {
                const on = choices[gi] === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoices((c) => c.map((x, i) => (i === gi ? o : x)))}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                      on ? "bg-ink-900 text-gold-200" : "bg-white text-ink-600 ring-1 ring-ink-900/10",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {item.extras && item.extras.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-2 text-[13px] font-semibold tracking-wide text-ink-400 uppercase">Add extras</legend>
            <div className="divide-y divide-ink-900/6 overflow-hidden rounded-2xl border border-ink-900/10 bg-white">
              {item.extras.map((e) => {
                const on = extraIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setExtraIds((ids) => (on ? ids.filter((x) => x !== e.id) : [...ids, e.id]))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-md border-2 transition",
                        on ? "border-ink-900 bg-ink-900 text-gold-300" : "border-ink-900/25",
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={4} />}
                    </span>
                    <span className="flex-1 text-[15px]">{e.name}</span>
                    <span className="tabular text-sm font-semibold text-ink-500">+ {rs(e.price)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label className="mt-6 block">
          <span className="mb-2 block text-[13px] font-semibold tracking-wide text-ink-400 uppercase">Special request</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="e.g. less spicy, no onions"
            className="h-12 w-full rounded-2xl border border-ink-900/12 bg-white px-4 text-[15px] outline-none placeholder:text-ink-300 focus:border-gold-500 focus:ring-4 focus:ring-gold-200/60"
          />
        </label>
      </div>

      <div className="safe-bottom sticky bottom-0 flex items-center gap-3 border-t border-ink-900/8 bg-cream-50 px-5 pt-4">
        <Stepper value={qty} onChange={setQty} min={1} max={20} />
        <Button variant="gold" size="lg" block disabled={!item.available} onClick={add}>
          {item.available ? (blocked ?? `Add to order · ${rs(priced.total)}`) : "Sold out"}
        </Button>
      </div>
    </div>
  );
}
