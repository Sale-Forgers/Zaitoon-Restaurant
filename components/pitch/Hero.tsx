import { ArrowRight, Check } from "lucide-react";
import { Diamonds, Logo } from "@/components/brand";
import { CLIENT } from "@/lib/pitch";
import { LinkButton } from "./parts";
import { HeroDevices } from "./vignettes";

const NAV: [label: string, href: string][] = [
  ["How it works", "#how"],
  ["Modules", "#modules"],
  ["Live demo", "#demo"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8">
        <a href="#top" aria-label={`${CLIENT.name}: back to top`} className="shrink-0">
          <Logo variant="full" className="h-11" />
        </a>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Sections">
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-sand-300 transition hover:bg-white/6 hover:text-sand-50"
            >
              {label}
            </a>
          ))}
        </nav>
        <LinkButton href="/demo" size="md" className="ml-auto">
          Open live demo
          <ArrowRight className="size-4" />
        </LinkButton>
      </div>
    </header>
  );
}

export function Hero({ dishes, categories }: { dishes: number; categories: number }) {
  const facts: [value: string, label: string][] = [
    [String(dishes), `dishes from your real menu, in ${categories} categories`],
    ["0", "apps for guests to install"],
    ["5", "live order stages, from received to served"],
    ["4", "screens working as one system"],
  ];

  return (
    <section id="top" className="relative overflow-hidden bg-ink-950 text-sand-50">
      <img
        src="/images/venue/rooftop-night.webp"
        alt=""
        width={1600}
        height={1203}
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover object-[60%_35%] opacity-75"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(11_10_8/0.97)_0%,rgb(11_10_8/0.9)_42%,rgb(11_10_8/0.66)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink-950 to-transparent" />
      <div className="absolute -top-48 right-[-12%] size-[680px] rounded-full bg-gold-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pt-14 pb-10 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_1fr] lg:gap-6 lg:pt-24 lg:pb-14">
        <div className="animate-rise">
          <div className="inline-flex items-center gap-3 rounded-full border border-gold-400/25 bg-gold-400/8 py-1.5 pr-4 pl-3.5">
            <span className="size-1.5 rounded-full bg-gold-400" />
            <span className="text-[9.5px] font-bold tracking-[0.12em] text-gold-200 uppercase sm:text-[11px] sm:tracking-[0.18em]">
              Proposal for {CLIENT.name}
            </span>
          </div>

          <h1 className="font-display mt-7 text-[2.7rem] leading-[1.04] font-medium sm:text-6xl xl:text-[4.5rem]">
            One smart system for your <span className="text-gold-sheen">entire dining floor</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-sand-300 sm:text-lg">
            Guests scan the table and order from their own phone. The kitchen sees the order the same second, waiters
            and the manager stay in step, and guests get live updates on their lock screen without installing any app.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <LinkButton href="/demo">
              Try the live demo
              <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="#pricing" tone="ghost-dark">
              See pricing
            </LinkButton>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sand-300">
            {["Built on your real menu", "No app for guests", "Android and iPhone"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-gold-400" strokeWidth={2.5} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <HeroDevices />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:pb-16">
        <div className="hairline-gold mb-8 opacity-60" />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {facts.map(([value, label]) => (
            <div key={label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <dt className="order-2 max-w-[11rem] text-[13px] leading-snug text-sand-400">{label}</dt>
              <dd className="font-display text-gold-sheen order-1 text-5xl leading-none font-medium sm:text-6xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex justify-center">
          <Diamonds />
        </div>
      </div>
    </section>
  );
}
