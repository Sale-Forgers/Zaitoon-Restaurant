import { ArrowDown, ArrowRight, ArrowUpRight, Globe, LockKeyhole, Server, Smartphone } from "lucide-react";
import Link from "next/link";
import { CLIENT, JOURNEY, MODULES } from "@/lib/pitch";
import { Eyebrow, Heading, Lead, LinkButton, PitchIcon, Section, Tick } from "./parts";
import { LockScreenVignette, StepVignette } from "./vignettes";

// ───────────────────────────── Built around Zaitoon ─────────────────────────────

export function BuiltAround({ dishes, categories }: { dishes: number; categories: number }) {
  const points = [
    {
      title: "Your printed menu, now live on every table",
      text: `All ${dishes} dishes across ${categories} categories, with your prices, sizes and add-ons, are loaded and ready to order.`,
    },
    {
      title: "Change it once, it changes everywhere",
      text: "A new price or a sold-out dish shows on every guest's phone and on the waiter tablets right away.",
    },
    {
      title: "Family Hall and Rooftop, table by table",
      text: "Every table has its own code, so the kitchen and waiters always know where an order belongs.",
    },
  ];

  return (
    <Section id="built" tone="cream">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Eyebrow>Built around {CLIENT.short}</Eyebrow>
          <Heading>This is not a template. It is already your restaurant.</Heading>
          <Lead>
            The demo you are about to try runs on Zaitoon&apos;s own menu and prices, under your own logo. Nothing here
            needs to be imagined: scan a table and order the way your guests will.
          </Lead>
          <ul className="mt-9 space-y-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <Tick className="mt-1 size-6" />
                <div>
                  <p className="font-display text-xl font-semibold">{p.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-xl py-12">
          <img
            src="/images/venue/printed-menu.webp"
            alt="Zaitoon's printed menu"
            width={1600}
            height={1067}
            loading="lazy"
            className="aspect-[3/2] w-full rounded-[28px] object-cover shadow-lift"
          />
          <img
            src="/images/venue/rooftop-day.webp"
            alt="The rooftop at Zaitoon"
            width={1600}
            height={900}
            loading="lazy"
            className="absolute top-0 right-4 aspect-[4/3] w-[36%] rounded-2xl border-4 border-cream-100 object-cover shadow-lift sm:-right-5"
          />
          <img
            src="/images/venue/hall.webp"
            alt="The family hall at Zaitoon"
            width={1600}
            height={900}
            loading="lazy"
            className="absolute right-4 bottom-0 aspect-[4/3] w-[46%] rounded-2xl border-4 border-cream-100 object-cover shadow-lift sm:-right-5"
          />
          <div className="absolute bottom-7 left-5 flex items-center gap-2 rounded-full bg-ink-900 py-2 pr-4 pl-2 text-xs font-semibold text-cream-50 shadow-lift">
            <span className="bg-gold-sheen flex size-6 items-center justify-center rounded-full text-ink-900">
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </span>
            From paper to every table
          </div>
        </div>
      </div>
    </Section>
  );
}

// ───────────────────────────── How it works ─────────────────────────────

export function Journey() {
  return (
    <Section id="how" tone="dark" className="bg-ink-sheen">
      <div className="max-w-3xl">
        <Eyebrow dark>How it works</Eyebrow>
        <Heading>An evening at Zaitoon, from the guest&apos;s side of the table</Heading>
        <Lead dark>
          Seven small moments, each one taken care of. Guests need nothing but the phone already in their hand.
        </Lead>
      </div>

      <ol className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {JOURNEY.map((step, i) => (
          <li
            key={step.id}
            className="flex flex-col rounded-[28px] border border-white/8 bg-white/[0.035] p-4 transition hover:border-gold-400/30"
          >
            <StepVignette id={step.id} />
            <div className="flex flex-1 flex-col px-2 pt-5 pb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-gold-sheen text-3xl leading-none font-medium">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-semibold text-sand-50">{step.title}</h3>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-sand-400">{step.text}</p>
            </div>
          </li>
        ))}
        <li className="flex flex-col justify-between rounded-[28px] border border-gold-400/30 bg-gold-400/[0.07] p-7">
          <div>
            <p className="font-display text-2xl leading-tight font-semibold text-sand-50">
              Now watch it happen for real.
            </p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-sand-300">
              The Demo Studio puts the guest&apos;s phone, the kitchen and the waiter side by side on one screen.
            </p>
          </div>
          <LinkButton href="/demo" size="md" className="mt-8 self-start">
            Open Demo Studio
            <ArrowRight className="size-4" />
          </LinkButton>
        </li>
      </ol>
    </Section>
  );
}

// ───────────────────────────── Modules ─────────────────────────────

export function Modules() {
  return (
    <Section id="modules" tone="cream">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow center>Modules</Eyebrow>
        <Heading>Four screens, one system</Heading>
        <Lead className="mx-auto">
          The guest&apos;s phone, the kitchen, the waiter and the manager all look at the same live orders. Nothing is
          typed twice and nothing is carried on paper.
        </Lead>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <article
            key={m.title}
            className="group flex flex-col rounded-[28px] border border-ink-900/8 bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-ink-900 text-gold-300">
              <PitchIcon name={m.icon} className="size-7" />
            </div>
            <h3 className="font-display mt-6 text-2xl font-semibold">{m.title}</h3>
            <p className="mt-1.5 text-[15px] text-ink-500">{m.line}</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {m.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-[14.5px] leading-snug text-ink-700">
                  <Tick />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href={m.link.href}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 self-start border-b border-gold-500/60 pb-0.5 text-sm font-semibold text-ink-900 transition hover:border-gold-600 hover:text-gold-700"
            >
              {m.link.label}
              <ArrowUpRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────────── Web push explainer ─────────────────────────────

const NODES = [
  {
    icon: Server,
    title: "Zaitoon's server",
    text: "Creates the message the moment an order changes stage and signs it with the restaurant's own keys.",
  },
  {
    icon: Globe,
    title: "The browser's push channel",
    text: "Already built into the guest's phone browser. It delivers the message even when the page is closed.",
  },
  {
    icon: Smartphone,
    title: "The guest's lock screen",
    text: "The update appears like any app notification. One tap opens the order.",
  },
];

export function PushExplainer() {
  return (
    <Section id="push" tone="white">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <Eyebrow>Notifications</Eyebrow>
          <Heading>No app. No third-party service.</Heading>
          <Lead>
            Guests turn on notifications with one tap in the browser. Messages use Web Push, the open standard built
            into modern browsers, so there is no notification company in the middle and no charge per message.
          </Lead>

          <div className="mt-8 flex max-w-xl gap-3.5 rounded-2xl border border-gold-500/30 bg-gold-50 p-4">
            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-gold-700" strokeWidth={1.8} />
            <p className="text-[14px] leading-relaxed text-ink-700">
              <span className="font-semibold text-ink-900">One honest note about iPhone.</span> Apple only allows web
              notifications after the guest adds the page to the Home Screen. On Android phones and desktop browsers it
              works straight from the browser. Guests who skip it still see every update live on their order page.
            </p>
          </div>
        </div>

        <LockScreenVignette />
      </div>

      <ol className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-0 lg:mt-20">
        {NODES.map((n, i) => (
          <li key={n.title} className="relative flex sm:block">
            <div className="h-full flex-1 rounded-[24px] border border-ink-900/8 bg-cream-100 p-6 sm:mx-3 lg:p-7">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-gold-300">
                  <n.icon className="size-6" strokeWidth={1.6} />
                </div>
                <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700 uppercase">Step {i + 1}</p>
              </div>
              <h3 className="font-display mt-5 text-2xl leading-tight font-semibold">{n.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-500">{n.text}</p>
            </div>
            {i < NODES.length - 1 && (
              <>
                <span className="bg-gold-sheen absolute top-1/2 -right-4 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-900 shadow-soft sm:flex">
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </span>
                <span className="bg-gold-sheen absolute -bottom-9 left-1/2 z-10 flex size-8 -translate-x-1/2 items-center justify-center rounded-full text-ink-900 shadow-soft sm:hidden">
                  <ArrowDown className="size-4" strokeWidth={2.5} />
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}
