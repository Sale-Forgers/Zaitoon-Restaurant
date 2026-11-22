import { ArrowRight, Check, Crown, Gem, Leaf, Minus } from "lucide-react";
import { cn } from "@/lib/format";
import {
  ADDONS,
  COMPARISON,
  includes,
  PACKAGES,
  PRICING_NOTES,
  ROLLOUT,
  usd,
  type Package,
  type TierId,
} from "@/lib/pitch";
import { Eyebrow, Heading, Lead, LinkButton, PitchIcon, Section, Tick } from "./parts";

const TIER_ICON: Record<TierId, typeof Leaf> = { essential: Leaf, signature: Gem, royal: Crown };

// ───────────────────────────── Package cards ─────────────────────────────

function PackageCard({ pkg }: { pkg: Package }) {
  const hot = Boolean(pkg.highlight);
  const Icon = TIER_ICON[pkg.id];
  const [whole] = usd(pkg.price).slice(1).split(".");
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[32px] p-7 sm:p-8",
        hot
          ? "bg-cream-50 text-ink-900 shadow-[0_40px_90px_-40px_rgb(220_180_75/0.65)] ring-1 ring-gold-300 lg:-my-5 lg:py-12"
          : "border border-white/10 bg-white/[0.035] text-sand-50",
      )}
    >
      {pkg.badge && (
        <span className="bg-gold-sheen absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.14em] whitespace-nowrap text-ink-900 uppercase shadow-gold">
          {pkg.badge}
        </span>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-2xl",
            hot ? "bg-ink-900 text-gold-300" : "bg-white/8 text-gold-300",
          )}
        >
          <Icon className="size-5" strokeWidth={1.7} />
        </span>
        <h3 className="font-display text-[1.7rem] font-semibold">{pkg.name}</h3>
      </div>

      <p className={cn("mt-4 min-h-12 text-[15px] leading-snug", hot ? "text-ink-500" : "text-sand-400")}>
        {pkg.forWhom}
      </p>

      <div className="mt-6 flex items-end gap-2.5">
        <span className={cn("font-display text-6xl leading-none font-medium", !hot && "text-gold-sheen")}>
          <span className="mr-0.5 align-top text-3xl">$</span>
          {whole}
        </span>
        <span
          className={cn(
            "mb-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
            hot ? "bg-olive-100 text-olive-700" : "bg-white/8 text-sand-300",
          )}
        >
          {pkg.priceNote}
        </span>
      </div>

      <div className={cn("my-7 h-px", hot ? "bg-ink-900/10" : "bg-white/10")} />

      {pkg.lead && (
        <p className={cn("mb-4 text-sm font-bold", hot ? "text-gold-700" : "text-gold-300")}>{pkg.lead}</p>
      )}
      <ul className="flex-1 space-y-3">
        {pkg.features.map((f) => (
          <li key={f} className={cn("flex gap-3 text-[14.5px] leading-snug", hot ? "text-ink-700" : "text-sand-200")}>
            <Tick dark={!hot} />
            {f}
          </li>
        ))}
      </ul>

      <LinkButton href="#rollout" tone={hot ? "gold" : "ghost-dark"} className="mt-9 w-full">
        {pkg.cta}
        <ArrowRight className="size-4" />
      </LinkButton>
    </article>
  );
}

// ───────────────────────────── Comparison table ─────────────────────────────

function Cell({ on, hot }: { on: boolean; hot?: boolean }) {
  return (
    <td className={cn("px-1 py-3.5 text-center align-middle", hot && "bg-gold-400/[0.06]")}>
      {on ? (
        <span className="bg-gold-sheen inline-flex size-6 items-center justify-center rounded-full text-ink-900">
          <Check className="size-3.5" strokeWidth={3} />
          <span className="sr-only">Included</span>
        </span>
      ) : (
        <span className="inline-flex size-6 items-center justify-center text-sand-500/60">
          <Minus className="size-4" />
          <span className="sr-only">Not included</span>
        </span>
      )}
    </td>
  );
}

function Comparison() {
  return (
    <div className="mt-20">
      <h3 className="font-display text-center text-3xl font-medium sm:text-4xl">Compare the packages</h3>
      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025]">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Features included in each package</caption>
          <colgroup>
            <col />
            <col className="w-[58px] sm:w-32 lg:w-44" />
            <col className="w-[58px] sm:w-32 lg:w-44" />
            <col className="w-[58px] sm:w-32 lg:w-44" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/10">
              <th scope="col" className="px-4 py-5 text-xs font-semibold tracking-wider text-sand-500 uppercase sm:px-7">
                Feature
              </th>
              {PACKAGES.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={cn("px-1 py-5 text-center align-bottom", p.highlight && "bg-gold-400/[0.06]")}
                >
                  <span className="font-display block text-[11px] font-semibold text-sand-50 sm:text-xl">{p.name}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-gold-300 sm:text-sm">
                    {usd(p.price)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {COMPARISON.map((group) => (
            <tbody key={group.title}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={4}
                  className="bg-white/[0.03] px-4 py-2.5 text-[11px] font-bold tracking-[0.18em] text-gold-300 uppercase sm:px-7"
                >
                  {group.title}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-t border-white/6">
                  <th
                    scope="row"
                    className="px-4 py-3.5 text-[13px] leading-snug font-medium text-sand-200 sm:px-7 sm:text-[15px]"
                  >
                    {row.label}
                  </th>
                  {PACKAGES.map((p) => (
                    <Cell key={p.id} on={includes(p.id, row.from)} hot={p.highlight} />
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <ul className="mx-auto mt-8 max-w-3xl space-y-2 text-center text-sm leading-relaxed text-sand-400">
        {PRICING_NOTES.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export function Pricing() {
  return (
    <Section id="pricing" tone="dark" className="bg-ink-sheen">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow dark center>
          Pricing
        </Eyebrow>
        <Heading>Three packages. One clear, one-time price each.</Heading>
        <Lead dark className="mx-auto">
          Every package runs on the same system you see in the demo. Start with what the floor needs today and move up
          whenever you are ready.
        </Lead>
      </div>

      <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
        {PACKAGES.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>

      <Comparison />
    </Section>
  );
}

// ───────────────────────────── Add-ons ─────────────────────────────

export function Addons() {
  return (
    <Section id="addons" tone="cream">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.7fr] lg:gap-16">
        <div>
          <Eyebrow>Add-ons</Eyebrow>
          <Heading>Grow when you are ready</Heading>
          <Lead>
            The same system can take on more of the restaurant later. These are optional, quoted separately and not
            part of the three packages.
          </Lead>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ADDONS.map((a) => (
            <li key={a.title} className="flex gap-4 rounded-[24px] border border-ink-900/8 bg-white p-5 shadow-soft">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-olive-100 text-olive-700">
                <PitchIcon name={a.icon} className="size-6" />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-ink-400 uppercase">Optional add-on</p>
                <h3 className="font-display mt-0.5 text-lg leading-tight font-semibold">{a.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{a.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

// ───────────────────────────── Rollout ─────────────────────────────

export function Rollout() {
  return (
    <Section id="rollout" tone="olive">
      <div className="pointer-events-none absolute -top-32 -right-24 size-[420px] rounded-full bg-gold-400/10 blur-3xl" />
      <div className="relative max-w-3xl">
        <Eyebrow dark>Rollout</Eyebrow>
        <Heading>From yes to a full dining room, step by step</Heading>
        <Lead dark className="text-olive-100">
          Once you choose a package, this is the path to go-live. We work alongside your team at every step.
        </Lead>
      </div>

      <ol className="relative mt-14 grid gap-8 lg:grid-cols-5 lg:gap-0">
        <span className="absolute top-6 right-[10%] left-[10%] hidden h-px bg-gold-300/40 lg:block" aria-hidden />
        {ROLLOUT.map((step, i) => (
          <li key={step.title} className="relative flex gap-5 lg:block lg:px-4 lg:text-center">
            <span className="bg-gold-sheen font-display relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-ink-900 shadow-gold lg:mx-auto">
              {i + 1}
            </span>
            <div className="lg:mt-6">
              <h3 className="font-display text-xl leading-tight font-semibold text-sand-50">{step.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-olive-100/85">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
