import { ArrowRight, Globe, Mail, MessageCircle, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { Diamonds, Logo } from "@/components/brand";
import { CLIENT, FAQ, VENDOR } from "@/lib/pitch";
import { Eyebrow, Heading, Lead, LinkButton, Section } from "./parts";

// ───────────────────────────── FAQ ─────────────────────────────

export function Faq() {
  return (
    <Section id="faq" tone="white">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Questions</Eyebrow>
          <Heading>Straight answers</Heading>
          <Lead>The things restaurant owners usually ask first. If yours is not here, ask us in the meeting.</Lead>
        </div>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-[22px] border border-ink-900/8 bg-white shadow-soft open:border-gold-400/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg leading-snug font-semibold sm:text-xl">{item.q}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-900/5 text-ink-700 transition group-open:rotate-45 group-open:bg-ink-900 group-open:text-gold-300">
                  <Plus className="size-4" strokeWidth={2.5} />
                </span>
              </summary>
              <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-500">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ───────────────────────────── Closing call to action ─────────────────────────────

function ContactChips() {
  const c = VENDOR.contact;
  const digits = c.whatsapp.replace(/\D/g, "");
  const items = [
    c.phone && { href: `tel:${c.phone.replace(/[^\d+]/g, "")}`, label: c.phone, icon: Phone },
    digits && { href: `https://wa.me/${digits}`, label: "WhatsApp", icon: MessageCircle },
    c.email && { href: `mailto:${c.email}`, label: c.email, icon: Mail },
    c.website && { href: c.website, label: c.website.replace(/^https?:\/\//, ""), icon: Globe },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone }[];
  if (!items.length) return null;
  return (
    <ul className="mt-8 flex flex-wrap justify-center gap-3">
      {items.map((i) => (
        <li key={i.href}>
          <a
            href={i.href}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-sand-100 transition hover:bg-white/8"
          >
            <i.icon className="size-4 text-gold-300" />
            {i.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ClosingBand() {
  return (
    <section className="relative overflow-hidden bg-ink-950 text-sand-50">
      <img
        src="/images/venue/rooftop-night.webp"
        alt=""
        width={1600}
        height={1203}
        loading="lazy"
        className="absolute inset-0 size-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_100%,rgb(11_10_8/0.55)_0%,rgb(11_10_8/0.94)_70%)]" />
      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
        <Diamonds />
        <h2 className="font-display mt-6 text-4xl leading-[1.08] font-medium sm:text-6xl">
          See it running on <span className="text-gold-sheen">your own tables</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-sand-300 sm:text-lg">
          Scan a table, place an order and watch the kitchen light up. It takes two minutes and it is already set up
          with {CLIENT.short}&apos;s menu.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <LinkButton href="/demo">
            Open the live demo
            <ArrowRight className="size-4" />
          </LinkButton>
          <LinkButton href="#pricing" tone="ghost-dark">
            Review the packages
          </LinkButton>
        </div>
        <ContactChips />
      </div>
    </section>
  );
}

// ───────────────────────────── Footer ─────────────────────────────

const SCREENS: [label: string, href: string][] = [
  ["Demo Studio", "/demo"],
  ["Kitchen display", "/kitchen"],
  ["Waiter app", "/waiter"],
  ["Admin panel", "/admin"],
];

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-ink-950 text-sand-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Logo variant="full" className="h-14 self-start sm:self-auto" />
          <div>
            <p className="text-sm font-semibold text-sand-100">
              Prepared for {CLIENT.name} by {VENDOR.name}
            </p>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-sand-500">
              Menu and prices are taken from zaitoonfamilyrestaurant.com. Orders, guests and ratings shown in the demo
              are sample data.
            </p>
          </div>
        </div>
        <nav aria-label="Live screens" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {SCREENS.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-gold-300">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
