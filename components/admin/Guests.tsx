"use client";

import { ArrowDown, BellRing, Megaphone, Repeat2, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, Empty } from "@/components/ui";
import { useLive, useSlowNow } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { ago, cn, num, rs } from "@/lib/format";
import type { GuestPublic } from "@/lib/types";
import { Avatar, LoadError, PageHeader, SampleTag, SearchBox, SkeletonGrid, SkeletonList, Stat } from "./parts";

type GuestRow = GuestPublic & { devices: number };
type SortKey = "lastSeenAt" | "visits" | "orders" | "spent";

const COLUMNS = "grid-cols-[minmax(200px,1.6fr)_72px_72px_112px_112px_72px_minmax(190px,1.2fr)]";

export function GuestsPage() {
  const guests = useLive(() => rpc("admin.guests"), "guests");
  const now = useSlowNow();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("lastSeenAt");

  const all: GuestRow[] = guests.data ?? [];
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const rows = all
    .filter((g) => !q || g.name.toLowerCase().includes(q) || (digits.length > 2 && (g.phone ?? "").replace(/\D/g, "").includes(digits)))
    .sort((a, b) => b[sort] - a[sort]);

  const withPush = all.filter((g) => g.pushEnabled).length;
  const returning = all.filter((g) => g.visits > 1).length;
  const optedIn = all.filter((g) => g.marketing).length;
  const pct = (n: number) => (all.length ? `${Math.round((n / all.length) * 100)}% of all guests` : "");

  return (
    <>
      <PageHeader
        title="Guests"
        subtitle="Everyone who has scanned a table: remembered by their phone, with no app and no login. This is your customer list."
      >
        <Link
          href="/admin/notifications"
          className="bg-gold-sheen inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-ink-900 shadow-gold transition hover:brightness-105"
        >
          <Megaphone className="size-4" /> Send an offer
        </Link>
      </PageHeader>

      {!guests.data ? (
        guests.error ? (
          <LoadError error={guests.error} retry={guests.refresh} />
        ) : (
          <div className="space-y-5">
            <SkeletonGrid />
            <SkeletonList />
          </div>
        )
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Guests on record" value={num(all.length)} icon={<Users className="size-[18px]" />} tone="olive" hint="Each one is a phone that scanned a table" />
            <Stat label="Notifications on" value={num(withPush)} icon={<BellRing className="size-[18px]" />} tone="leaf" hint={pct(withPush)} />
            <Stat label="Returning guests" value={num(returning)} icon={<Repeat2 className="size-[18px]" />} tone="gold" hint={pct(returning)} />
            <Stat label="Happy to get offers" value={num(optedIn)} icon={<Megaphone className="size-[18px]" />} tone="sky" hint={pct(optedIn)} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchBox value={query} onChange={setQuery} placeholder="Search by name or phone number" className="min-w-56 flex-1 sm:max-w-sm" />
            <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-500 lg:hidden">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-full border border-ink-900/12 bg-white px-3 text-[13px] font-semibold text-ink-900"
              >
                <option value="lastSeenAt">Last seen</option>
                <option value="visits">Visits</option>
                <option value="orders">Orders</option>
                <option value="spent">Total spent</option>
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <Card>
              <Empty
                icon={<Users className="size-6" />}
                title={q ? "No guest matches your search" : "No guests yet"}
                text={q ? "Try part of the name or the last digits of the phone number." : "Guests appear here as soon as they scan a table and enter their name."}
              />
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden overflow-hidden lg:block">
                <div className={cn("grid items-center gap-4 border-b border-ink-900/8 bg-cream-50 px-6 py-3 text-[11px] font-semibold tracking-wider text-ink-400 uppercase", COLUMNS)}>
                  <span>Guest</span>
                  <SortHead label="Visits" active={sort === "visits"} onClick={() => setSort("visits")} />
                  <SortHead label="Orders" active={sort === "orders"} onClick={() => setSort("orders")} />
                  <SortHead label="Spent" active={sort === "spent"} onClick={() => setSort("spent")} />
                  <SortHead label="Last seen" active={sort === "lastSeenAt"} onClick={() => setSort("lastSeenAt")} />
                  <span className="text-right">Table</span>
                  <span>Reach</span>
                </div>
                <ul className="divide-y divide-ink-900/6">
                  {rows.map((g) => (
                    <li key={g.id} className={cn("grid items-center gap-4 px-6 py-3", COLUMNS)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={g.name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900">
                            <span className="truncate">{g.name}</span>
                            {g.sample && <SampleTag />}
                          </p>
                          <p className="tabular truncate text-xs text-ink-400">{g.phone ?? "No phone number given"}</p>
                        </div>
                      </div>
                      <span className="tabular text-right text-sm font-medium">{g.visits}</span>
                      <span className="tabular text-right text-sm font-medium">{g.orders}</span>
                      <span className="tabular text-right text-sm font-semibold">{rs(g.spent)}</span>
                      <span className="text-right text-[13px] text-ink-500">{now ? ago(g.lastSeenAt, now) : ""}</span>
                      <span className="tabular text-right text-sm text-ink-500">{g.lastTable ?? "—"}</span>
                      <Reach guest={g} />
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Phone / tablet cards */}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {rows.map((g) => (
                  <li key={g.id}>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={g.name} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <span className="truncate">{g.name}</span>
                            {g.sample && <SampleTag />}
                          </p>
                          <p className="tabular truncate text-xs text-ink-400">{g.phone ?? "No phone number given"}</p>
                        </div>
                        <span className="shrink-0 text-xs text-ink-400">{now ? ago(g.lastSeenAt, now) : ""}</span>
                      </div>
                      <div className="tabular mt-3.5 grid grid-cols-3 gap-2 rounded-2xl bg-ink-900/[0.04] px-3 py-2.5 text-center">
                        <Figure label="Visits" value={String(g.visits)} />
                        <Figure label="Orders" value={String(g.orders)} />
                        <Figure label="Spent" value={rs(g.spent)} />
                      </div>
                      <div className="mt-3">
                        <Reach guest={g} />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

function SortHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex items-center justify-end gap-1 text-right tracking-wider uppercase transition hover:text-ink-900", active && "text-ink-900")}
      title={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      <ArrowDown className={cn("size-3", active ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

function Reach({ guest }: { guest: GuestRow }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {guest.pushEnabled ? (
          <Badge tone="leaf">
            <BellRing className="size-3" /> Notifications on
          </Badge>
        ) : (
          <Badge>Notifications off</Badge>
        )}
        {guest.marketing && <Badge tone="sky">Offers</Badge>}
      </div>
      {guest.device && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
          <Smartphone className="size-3" /> {guest.device}
        </p>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-900">{value}</p>
      <p className="text-[11px] text-ink-400">{label}</p>
    </div>
  );
}
