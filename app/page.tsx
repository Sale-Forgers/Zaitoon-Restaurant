import type { Metadata } from "next";
import { ClosingBand, Faq, Footer } from "@/components/pitch/Closing";
import { DemoLauncher } from "@/components/pitch/DemoLauncher";
import { Hero, Nav } from "@/components/pitch/Hero";
import { Eyebrow, Heading, Section } from "@/components/pitch/parts";
import { Addons, Pricing, Rollout } from "@/components/pitch/Pricing";
import { BuiltAround, Journey, Modules, PushExplainer } from "@/components/pitch/Story";
import { CATEGORIES, MENU_ITEMS } from "@/lib/seed/menu";

export const metadata: Metadata = {
  title: { absolute: "Zaitoon Smart Dining · Proposal for Zaitoon Family Restaurant" },
  description:
    "One smart system for the whole dining floor: table ordering by QR or NFC, a live kitchen display, a waiter app, an admin panel and guest notifications with no app to install.",
};

/**
 * The proposal shown to the restaurant owner. All copy, packages and prices
 * live in lib/pitch.ts.
 */
export default function ProposalPage() {
  const dishes = MENU_ITEMS.length;
  const categories = CATEGORIES.length;

  return (
    <>
      <Nav />
      <main>
        <Hero dishes={dishes} categories={categories} />
        <BuiltAround dishes={dishes} categories={categories} />
        <Journey />
        <Modules />

        <Section id="demo" tone="dark">
          <div className="pointer-events-none absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <Eyebrow dark center>
              Live demo
            </Eyebrow>
            <Heading>Try it now, on your own phone</Heading>
          </div>
          <DemoLauncher />
        </Section>

        <PushExplainer />
        <Pricing />
        <Addons />
        <Rollout />
        <Faq />
        <ClosingBand />
      </main>
      <Footer />
    </>
  );
}
