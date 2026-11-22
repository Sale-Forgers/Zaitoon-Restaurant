"use client";

import { Flame, Pencil, Plus, Star, Trash2, Utensils, X } from "lucide-react";
import { useCallback, useState } from "react";
import { dishImage } from "@/components/brand";
import { Badge, Button, Card, Empty, IconButton, Input, Label, Select, Sheet, Textarea, Toggle } from "@/components/ui";
import { useLive } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { cn, rs } from "@/lib/format";
import type { Category, ChoiceGroup, Extra, MenuItem } from "@/lib/types";
import { LoadError, PageHeader, SearchBox, SkeletonList, useAction, useConfirm } from "./parts";

interface ItemDraft {
  id?: string;
  name: string;
  desc: string;
  categoryId: string;
  price: string;
  unit: string;
  popular: boolean;
  spicy: boolean;
  available: boolean;
  image?: string;
  variants: { name: string; price: string }[];
  choices?: ChoiceGroup[];
  extras?: Extra[];
}

const toDraft = (item: MenuItem): ItemDraft => ({
  id: item.id,
  name: item.name,
  desc: item.desc ?? "",
  categoryId: item.categoryId,
  price: String(item.price),
  unit: item.unit ?? "",
  popular: Boolean(item.popular),
  spicy: Boolean(item.spicy),
  available: item.available,
  image: item.image,
  variants: (item.variants ?? []).map((v) => ({ name: v.name, price: String(v.price) })),
  choices: item.choices,
  extras: item.extras,
});

export function MenuManager() {
  const menu = useLive(() => rpc("menu.get"), "menu");
  const { run } = useAction();
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [catDraft, setCatDraft] = useState<{ id?: string; name: string } | null>(null);
  // Switches flip instantly; the server value takes over once it has been saved.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const closeDraft = useCallback(() => setDraft(null), []);
  const closeCat = useCallback(() => setCatDraft(null), []);

  const data = menu.data;
  if (!data) {
    return (
      <>
        <PageHeader title="Menu" />
        {menu.error ? <LoadError error={menu.error} retry={menu.refresh} /> : <SkeletonList rows={8} />}
      </>
    );
  }

  const { categories, items } = data;
  const isAvailable = (i: MenuItem) => optimistic[i.id] ?? i.available;
  const soldOut = items.filter((i) => !isAvailable(i)).length;
  const q = query.trim().toLowerCase();
  const visible = items.filter((i) =>
    q ? `${i.name} ${i.desc ?? ""}`.toLowerCase().includes(q) : cat === "all" || i.categoryId === cat,
  );
  const groups = categories
    .map((c) => ({ category: c, list: visible.filter((i) => i.categoryId === c.id) }))
    .filter((g) => g.list.length > 0 || (!q && cat === g.category.id));
  const selected = categories.find((c) => c.id === cat);

  const forget = (id: string) =>
    setOptimistic((o) => {
      const next = { ...o };
      delete next[id];
      return next;
    });

  const toggle = async (item: MenuItem, available: boolean) => {
    setOptimistic((o) => ({ ...o, [item.id]: available }));
    const res = await run(
      `avail:${item.id}`,
      () => rpc("admin.item.available", { id: item.id, available }),
      available ? `${item.name} is back on the menu` : `${item.name} marked as sold out`,
    );
    // Keep the optimistic value until the refreshed menu has arrived.
    if (res) window.setTimeout(() => forget(item.id), 2500);
    else forget(item.id);
  };

  const addDish = () =>
    setDraft({
      name: "",
      desc: "",
      categoryId: selected?.id ?? categories[0]?.id ?? "",
      price: "",
      unit: "",
      popular: false,
      spicy: false,
      available: true,
      variants: [],
    });

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={`${items.length} dishes in ${categories.length} categories${soldOut ? ` · ${soldOut} sold out right now` : ""}. Changes reach every guest's phone and the waiter tablets within seconds.`}
      >
        <Button variant="outline" icon={<Plus className="size-4" />} onClick={() => setCatDraft({ name: "" })}>
          Category
        </Button>
        <Button variant="gold" icon={<Plus className="size-4" />} onClick={addDish} disabled={!categories.length}>
          Add dish
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Categories */}
        <div className="min-w-0">
          <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:sticky lg:top-8 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0" aria-label="Categories">
            <CategoryButton label="All dishes" count={items.length} active={cat === "all" && !q} onClick={() => setCat("all")} />
            {categories.map((c) => (
              <CategoryButton
                key={c.id}
                label={c.name}
                count={items.filter((i) => i.categoryId === c.id).length}
                active={cat === c.id && !q}
                onClick={() => setCat(c.id)}
                onEdit={() => setCatDraft({ id: c.id, name: c.name })}
              />
            ))}
          </nav>
        </div>

        {/* Dishes */}
        <div className="min-w-0">
          <SearchBox value={query} onChange={setQuery} placeholder="Search the whole menu" className="mb-4 max-w-md" />

          {groups.length === 0 ? (
            <Card>
              <Empty
                icon={<Utensils className="size-6" />}
                title={q ? "No dish matches your search" : "This category is empty"}
                text={q ? "Check the spelling or search for part of the name." : "Add the first dish to this category."}
              >
                {!q && (
                  <Button variant="gold" icon={<Plus className="size-4" />} onClick={addDish}>
                    Add dish
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <div className="space-y-7">
              {groups.map(({ category, list }) => (
                <section key={category.id}>
                  <div className="mb-2.5 flex items-center gap-3">
                    <h2 className="font-display text-xl font-semibold">{category.name}</h2>
                    <span className="text-sm text-ink-400">{list.length}</span>
                    <IconButton
                      label={`Rename ${category.name}`}
                      className="-ml-1.5 size-8"
                      onClick={() => setCatDraft({ id: category.id, name: category.name })}
                    >
                      <Pencil className="size-3.5 text-ink-300" />
                    </IconButton>
                  </div>
                  {list.length === 0 ? (
                    <Card>
                      <Empty icon={<Utensils className="size-6" />} title="This category is empty" text="Add the first dish to this category.">
                        <Button variant="gold" icon={<Plus className="size-4" />} onClick={addDish}>
                          Add dish
                        </Button>
                      </Empty>
                    </Card>
                  ) : (
                    <Card className="divide-y divide-ink-900/6 overflow-hidden">
                      {list.map((item) => (
                        <DishRow
                          key={item.id}
                          item={item}
                          available={isAvailable(item)}
                          onEdit={() => setDraft(toDraft(item))}
                          onToggle={(v) => toggle(item, v)}
                        />
                      ))}
                    </Card>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <DishSheet draft={draft} categories={categories} onChange={setDraft} onClose={closeDraft} />
      <CategorySheet draft={catDraft} onChange={setCatDraft} onClose={closeCat} onDeleted={() => setCat("all")} />
    </>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
  onEdit,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded-full transition lg:rounded-2xl",
        active ? "bg-ink-900 text-cream-50 shadow-soft" : "bg-white text-ink-600 hover:bg-white lg:bg-transparent lg:hover:bg-ink-900/5",
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pr-2 pl-4 text-left text-[13px] font-semibold lg:py-2.5">
        <span className="truncate whitespace-nowrap">{label}</span>
        <span className={cn("tabular ml-auto text-xs font-medium", active ? "text-gold-300" : "text-ink-300")}>{count}</span>
      </button>
      {onEdit ? (
        <button
          onClick={onEdit}
          aria-label={`Rename ${label}`}
          title="Rename or delete"
          className={cn(
            "mr-1.5 hidden size-7 shrink-0 items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 lg:flex",
            active ? "hover:bg-white/15" : "hover:bg-ink-900/8",
          )}
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <span className="w-2 lg:w-[34px]" />
      )}
    </div>
  );
}

function DishRow({
  item,
  available,
  onEdit,
  onToggle,
}: {
  item: MenuItem;
  available: boolean;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
}) {
  const thumb = dishImage(item.image, true);
  return (
    <div className={cn("flex items-center gap-3.5 px-4 py-3 sm:px-5", !available && "bg-cream-100/70")}>
      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className={cn("size-14 shrink-0 rounded-2xl object-cover", !available && "opacity-50 grayscale")} />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink-900/[0.04] text-ink-300">
            <Utensils className="size-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[15px] font-semibold", available ? "text-ink-900" : "text-ink-400")}>{item.name}</span>
            {item.unit && <span className="text-xs text-ink-400">{item.unit}</span>}
            {item.popular && (
              <Badge tone="gold">
                <Star className="size-3 fill-current" /> Popular
              </Badge>
            )}
            {item.spicy && (
              <Badge tone="ember">
                <Flame className="size-3" /> Spicy
              </Badge>
            )}
          </span>
          {item.desc && <span className="mt-0.5 line-clamp-1 text-[13px] text-ink-400">{item.desc}</span>}
          <span className="tabular mt-1 block text-sm font-semibold text-ink-700 sm:hidden">{priceLabel(item)}</span>
        </span>
      </button>
      <span className="tabular hidden w-28 shrink-0 text-right text-sm font-semibold text-ink-700 sm:block">{priceLabel(item)}</span>
      <div className="flex w-[74px] shrink-0 flex-col items-center gap-1">
        <Toggle checked={available} onChange={onToggle} label={`${item.name} available`} />
        <span className={cn("text-[11px] font-semibold", available ? "text-leaf-600" : "text-ruby-500")}>
          {available ? "Available" : "Sold out"}
        </span>
      </div>
      {/* On phones the row itself opens the editor. */}
      <span className="hidden sm:block">
        <IconButton label={`Edit ${item.name}`} className="size-9" onClick={onEdit}>
          <Pencil className="size-4 text-ink-400" />
        </IconButton>
      </span>
    </div>
  );
}

const priceLabel = (item: MenuItem) => (item.variants?.length ? `from ${rs(item.price)}` : rs(item.price));

// ───────────────────────────── Dish editor ─────────────────────────────

function DishSheet({
  draft,
  categories,
  onChange,
  onClose,
}: {
  draft: ItemDraft | null;
  categories: Category[];
  onChange: (d: ItemDraft | null) => void;
  onClose: () => void;
}) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  if (!draft) return null;

  const set = (patch: Partial<ItemDraft>) => onChange({ ...draft, ...patch });
  const setVariant = (index: number, patch: Partial<{ name: string; price: string }>) =>
    set({ variants: draft.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const hasVariants = draft.variants.length > 0;

  const save = async () => {
    const saved = await run(
      "save",
      () =>
        rpc("admin.item.save", {
          item: {
            id: draft.id,
            name: draft.name,
            desc: draft.desc,
            categoryId: draft.categoryId,
            price: Number(draft.price) || 0,
            unit: draft.unit,
            popular: draft.popular,
            spicy: draft.spicy,
            available: draft.available,
            image: draft.image,
            variants: draft.variants
              .filter((v) => v.name.trim())
              .map((v) => ({ id: "", name: v.name.trim(), price: Number(v.price) || 0 })),
            choices: draft.choices,
            extras: draft.extras,
          },
        }),
      (item) => (draft.id ? `${item.name} updated` : `${item.name} added to the menu`),
    );
    if (saved) onClose();
  };

  const remove = async () => {
    if (!draft.id) return;
    const ok = await confirm({
      title: `Delete ${draft.name}?`,
      text: "The dish disappears from the menu on every phone and tablet. Past orders keep it in the reports. To hide it for a while, mark it as sold out instead.",
      confirmLabel: "Delete dish",
      danger: true,
    });
    if (!ok) return;
    const res = await run("delete", () => rpc("admin.item.delete", { id: draft.id! }), `${draft.name} deleted`);
    if (res) onClose();
  };

  const photo = dishImage(draft.image);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={draft.id ? "Edit dish" : "Add a dish"}
      footer={
        <div className="flex items-center gap-3 pb-1">
          {draft.id && (
            <Button
              variant="ghost"
              className="text-ruby-600 hover:bg-ruby-50"
              icon={<Trash2 className="size-4" />}
              loading={busy === "delete"}
              onClick={remove}
            >
              Delete
            </Button>
          )}
          <Button variant="outline" className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" loading={busy === "save"} onClick={save}>
            {draft.id ? "Save changes" : "Add dish"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {photo && <img src={photo} alt="" className="h-40 w-full rounded-2xl object-cover" />}

        <label className="block">
          <Label>Name</Label>
          <Input value={draft.name} maxLength={80} placeholder="Chicken Karahi" onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="block">
          <Label hint={`${draft.desc.length}/300`}>Description</Label>
          <Textarea value={draft.desc} maxLength={300} placeholder="What makes it special, how it is served" onChange={(e) => set({ desc: e.target.value })} />
        </label>

        <div className={cn("grid grid-cols-1 gap-3", hasVariants ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          <label className="block">
            <Label>Category</Label>
            <Select value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          {!hasVariants && (
            <label className="block">
              <Label>Price (Rs)</Label>
              <Input type="number" inputMode="numeric" min={0} value={draft.price} placeholder="0" onChange={(e) => set({ price: e.target.value })} />
            </label>
          )}
          <label className="block">
            <Label hint="Optional">Portion note</Label>
            <Input value={draft.unit} maxLength={20} placeholder="4 pcs, Serves 2" onChange={(e) => set({ unit: e.target.value })} />
          </label>
        </div>

        <div className="rounded-2xl border border-ink-900/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Sizes or options with their own price</p>
              <p className="text-xs text-ink-400">For example Half / Full, or Chicken / Beef / Prawn.</p>
            </div>
            <Button variant="soft" size="sm" icon={<Plus className="size-3.5" />} onClick={() => set({ variants: [...draft.variants, { name: "", price: "" }] })}>
              Add
            </Button>
          </div>
          {hasVariants && (
            <div className="mt-3 space-y-2">
              {draft.variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Input value={v.name} maxLength={30} placeholder="Name, e.g. Full" className="h-11" onChange={(e) => setVariant(i, { name: e.target.value })} />
                  </div>
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={v.price}
                      placeholder="Rs"
                      className="h-11"
                      onChange={(e) => setVariant(i, { price: e.target.value })}
                    />
                  </div>
                  <IconButton label="Remove this option" className="size-9" onClick={() => set({ variants: draft.variants.filter((_, x) => x !== i) })}>
                    <X className="size-4 text-ink-400" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {(draft.choices?.length || draft.extras?.length) && (
          <div className="space-y-2 rounded-2xl bg-ink-900/[0.04] p-4 text-[13px] text-ink-600">
            <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Asked when ordering (kept as they are)</p>
            {draft.choices?.map((g) => (
              <p key={g.id}>
                <b className="text-ink-900">{g.name}:</b> {g.options.join(", ")}
              </p>
            ))}
            {draft.extras?.length ? (
              <p>
                <b className="text-ink-900">Add-ons:</b> {draft.extras.map((e) => `${e.name} (+${rs(e.price)})`).join(", ")}
              </p>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Switch label="Available" hint="Off = sold out" checked={draft.available} onChange={(v) => set({ available: v })} />
          <Switch label="Popular" hint="Featured at the top" checked={draft.popular} onChange={(v) => set({ popular: v })} />
          <Switch label="Spicy" hint="Shows a chilli mark" checked={draft.spicy} onChange={(v) => set({ spicy: v })} />
        </div>
      </div>
    </Sheet>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-900/[0.04] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-ink-400">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

// ───────────────────────────── Category editor ─────────────────────────────

function CategorySheet({
  draft,
  onChange,
  onClose,
  onDeleted,
}: {
  draft: { id?: string; name: string } | null;
  onChange: (d: { id?: string; name: string } | null) => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { run, busy } = useAction();
  if (!draft) return null;

  const save = async () => {
    const saved = await run(
      "save",
      () => rpc("admin.category.save", { id: draft.id, name: draft.name }),
      (c) => (draft.id ? `Category renamed to ${c.name}` : `${c.name} added`),
    );
    if (saved) onClose();
  };
  const remove = async () => {
    const res = await run("delete", () => rpc("admin.category.delete", { id: draft.id! }), "Category deleted");
    if (res) {
      onDeleted();
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="sm"
      title={draft.id ? "Rename category" : "New category"}
      footer={
        <div className="flex items-center gap-3 pb-1">
          {draft.id && (
            <Button variant="ghost" className="text-ruby-600 hover:bg-ruby-50" loading={busy === "delete"} onClick={remove}>
              Delete
            </Button>
          )}
          <Button variant="gold" className="ml-auto" loading={busy === "save"} onClick={save}>
            {draft.id ? "Save" : "Add category"}
          </Button>
        </div>
      }
    >
      <label className="block pt-1">
        <Label>Category name</Label>
        <Input
          value={draft.name}
          maxLength={40}
          placeholder="Chef's Specials"
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
      </label>
      {draft.id && <p className="mt-3 text-xs text-ink-400">A category can only be deleted once it has no dishes in it.</p>}
    </Sheet>
  );
}
