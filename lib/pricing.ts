import type { Bill, MenuItem, OrderLine, OrderLineInput, Settings } from "@/lib/types";

/**
 * Turns what a guest picked into a priced order line.
 * Shared by the phone (to show the cart) and the server (the only price that counts).
 */
export function priceLine(item: MenuItem, input: OrderLineInput): OrderLine {
  const qty = Math.max(1, Math.min(50, Math.floor(Number(input.qty) || 1)));

  let unit = item.price;
  let variantName: string | undefined;
  if (item.variants?.length) {
    const v = item.variants.find((x) => x.id === input.variantId) ?? item.variants[0];
    unit = v.price;
    variantName = v.name;
  }

  const chosen: string[] = [];
  if (item.choices?.length) {
    item.choices.forEach((group, i) => {
      const picked = input.choices?.[i];
      chosen.push(picked && group.options.includes(picked) ? picked : group.options[0]);
    });
  }

  const extras: { name: string; price: number }[] = [];
  for (const id of input.extraIds ?? []) {
    const e = item.extras?.find((x) => x.id === id);
    if (e && !extras.some((x) => x.name === e.name)) {
      extras.push({ name: e.name, price: e.price });
      unit += e.price;
    }
  }

  const note = input.note?.trim().slice(0, 140) || undefined;

  return {
    itemId: item.id,
    name: item.name,
    qty,
    unitPrice: unit,
    variant: variantName,
    choices: chosen.length ? chosen : undefined,
    extras: extras.length ? extras : undefined,
    note,
    total: unit * qty,
  };
}

export function billFor(
  subtotal: number,
  ordering: Pick<Settings["ordering"], "servicePct" | "taxPct" | "taxLabel">,
): Bill {
  const service = Math.round((subtotal * (ordering.servicePct || 0)) / 100);
  const tax = Math.round((subtotal * (ordering.taxPct || 0)) / 100);
  return {
    subtotal,
    service,
    tax,
    total: subtotal + service + tax,
    servicePct: ordering.servicePct || 0,
    taxPct: ordering.taxPct || 0,
    taxLabel: ordering.taxLabel || "Tax",
  };
}

/** One-line description of a line's options, e.g. "Beef · Mushroom · Jacket potato". */
export function lineOptions(line: Pick<OrderLine, "variant" | "choices" | "extras">): string {
  return [line.variant, ...(line.choices ?? []), ...(line.extras ?? []).map((e) => `+ ${e.name}`)]
    .filter(Boolean)
    .join(" · ");
}
