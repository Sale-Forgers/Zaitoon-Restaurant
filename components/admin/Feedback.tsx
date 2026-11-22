"use client";

import { MessageSquareHeart, Quote, Star, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge, Card, Empty, Segmented, Stars } from "@/components/ui";
import { useLive } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { cn, dateTime } from "@/lib/format";
import type { Feedback } from "@/lib/types";
import { Avatar, LoadError, PageHeader, Panel, SampleTag, SkeletonGrid, SkeletonList } from "./parts";

const overall = (f: Feedback) => (f.food + f.service + f.ambience) / 3;
/** A review the manager should read first. */
const needsAttention = (f: Feedback) => overall(f) < 3.5 || Math.min(f.food, f.service, f.ambience) <= 2;
const mean = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

export function FeedbackPage() {
  const feedback = useLive(() => rpc("admin.feedback"), "feedback");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const all = feedback.data ?? [];
  const flagged = all.filter(needsAttention);
  const rows = filter === "all" ? all : flagged;

  const average = mean(all.map(overall));
  const categories = [
    { label: "Food", value: mean(all.map((f) => f.food)) },
    { label: "Service", value: mean(all.map((f) => f.service)) },
    { label: "Ambience", value: mean(all.map((f) => f.ambience)) },
  ];
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: all.filter((f) => Math.round(overall(f)) === stars).length,
  }));
  const ranked = [...categories].sort((a, b) => a.value - b.value);
  // Only single out a category when it really trails the best one.
  const weakest = all.length && ranked[2].value - ranked[0].value >= 0.1 ? ranked[0] : null;

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="After the bill is closed, guests get a gentle request on their phone to rate the food, the service and the ambience."
      />

      {!feedback.data ? (
        feedback.error ? (
          <LoadError error={feedback.error} retry={feedback.refresh} />
        ) : (
          <div className="space-y-5">
            <SkeletonGrid count={3} className="grid-cols-1 lg:grid-cols-3" />
            <SkeletonList />
          </div>
        )
      ) : all.length === 0 ? (
        <Card>
          <Empty
            icon={<MessageSquareHeart className="size-6" />}
            title="No reviews yet"
            text="Reviews arrive here as guests rate their visit from their phone."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="bg-ink-sheen relative overflow-hidden rounded-3xl p-6 text-sand-100 shadow-lift">
              <div className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-gold-500/15 blur-3xl" />
              <p className="text-[13px] font-medium text-sand-400">Overall rating</p>
              <div className="mt-2 flex items-end gap-3">
                <p className="font-display text-gold-sheen tabular text-[64px] leading-none font-semibold">{average.toFixed(1)}</p>
                <p className="pb-2 text-sm text-sand-400">out of 5</p>
              </div>
              <div className="mt-3 flex gap-1" role="img" aria-label={`${average.toFixed(1)} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn("size-[22px]", n <= Math.round(average) ? "fill-gold-400 text-gold-400" : "fill-transparent text-white/25")}
                    strokeWidth={1.6}
                  />
                ))}
              </div>
              <p className="mt-4 text-sm text-sand-400">
                From {all.length} {all.length === 1 ? "review" : "reviews"}
                {flagged.length > 0 && ` · ${flagged.length} need${flagged.length === 1 ? "s" : ""} a look`}
              </p>
            </div>

            <Panel title="By category" subtitle={weakest ? `${weakest.label} has the most room to improve` : "Guests rate all three about the same"}>
              <div className="space-y-4">
                {categories.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-ink-700">{c.label}</span>
                      <span className="font-display tabular text-lg font-semibold">{c.value.toFixed(1)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-900/8">
                      <div className="bg-gold-sheen h-full rounded-full transition-all duration-500" style={{ width: `${(c.value / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="How guests rated" subtitle="Number of reviews per star">
              <div className="space-y-2.5">
                {distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-3">
                    <span className="tabular flex w-8 shrink-0 items-center gap-1 text-[13px] font-semibold text-ink-700">
                      {d.stars} <Star className="size-3 fill-gold-400 text-gold-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/8">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", d.stars >= 4 ? "bg-leaf-500" : d.stars === 3 ? "bg-gold-400" : "bg-ember-500")}
                        style={{ width: `${all.length ? (d.count / all.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="tabular w-6 shrink-0 text-right text-[13px] text-ink-400">{d.count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">What guests said</h2>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All (${all.length})` },
                { value: "attention", label: `Needs a look (${flagged.length})` },
              ]}
            />
          </div>

          {rows.length === 0 ? (
            <Card>
              <Empty icon={<Star className="size-6" />} title="Nothing needs attention" text="Every guest so far left happy. Keep it up!" />
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {rows.map((f) => {
                const low = needsAttention(f);
                return (
                  <li key={f.id}>
                    <Card className={cn("flex h-full flex-col p-5", low && "border-ember-400/50 bg-ember-50/40")}>
                      <div className="flex items-center gap-3">
                        <Avatar name={f.guestName} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <span className="truncate">{f.guestName}</span>
                            {f.sample && <SampleTag />}
                          </p>
                          <p className="truncate text-xs text-ink-400">
                            {f.tableNumber ? `Table ${f.tableNumber} · ` : ""}
                            {dateTime(f.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display tabular text-2xl leading-none font-semibold">{overall(f).toFixed(1)}</p>
                          <Stars value={overall(f)} size={11} />
                        </div>
                      </div>

                      {f.comment ? (
                        <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-ink-700">
                          <Quote className="mt-0.5 size-4 shrink-0 rotate-180 text-gold-500" />
                          <span>{f.comment}</span>
                        </p>
                      ) : (
                        <p className="mt-4 text-sm text-ink-300">No comment left.</p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                        <Score label="Food" value={f.food} />
                        <Score label="Service" value={f.service} />
                        <Score label="Ambience" value={f.ambience} />
                        {low && (
                          <Badge tone="ember" className="ml-auto">
                            <TriangleAlert className="size-3" /> Needs a look
                          </Badge>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        value <= 2 ? "bg-ruby-100 text-ruby-700" : value === 3 ? "bg-gold-100 text-gold-800" : "bg-ink-900/6 text-ink-600",
      )}
    >
      {label} {value}
      <Star className="size-2.5 fill-current" />
    </span>
  );
}
