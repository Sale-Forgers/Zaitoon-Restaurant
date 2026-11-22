import {
  Banknote,
  BellRing,
  Bike,
  Boxes,
  Check,
  ChefHat,
  ConciergeBell,
  CreditCard,
  Gift,
  LayoutDashboard,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Diamonds } from "@/components/brand";
import { cn } from "@/lib/format";
import type { IconKey } from "@/lib/pitch";

/** Icons for the entries in lib/pitch.ts. */
export function PitchIcon({ name, className }: { name: IconKey; className?: string }) {
  const Icon = {
    pos: Banknote,
    inventory: Boxes,
    delivery: Bike,
    payments: CreditCard,
    loyalty: Gift,
    branches: Store,
    guest: Smartphone,
    kitchen: ChefHat,
    waiter: ConciergeBell,
    admin: LayoutDashboard,
    push: BellRing,
    crm: Users,
  }[name];
  return <Icon className={className} strokeWidth={1.6} />;
}

export function Section({
  id,
  tone = "cream",
  className,
  children,
}: {
  id?: string;
  tone?: "cream" | "white" | "dark" | "olive";
  className?: string;
  children: ReactNode;
}) {
  const bg = {
    cream: "bg-cream-100 text-ink-900",
    white: "bg-cream-50 text-ink-900",
    dark: "bg-ink-950 text-sand-50",
    olive: "bg-olive-800 text-sand-50",
  }[tone];
  return (
    // overflow-clip (not hidden) trims decorative glows without breaking sticky children.
    <section id={id} className={cn("relative scroll-mt-20 overflow-clip", bg, className)}>
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, dark, center }: { children: ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", center && "justify-center")}>
      <span
        className={cn(
          "text-[11px] font-bold tracking-[0.22em] uppercase",
          dark ? "text-gold-300" : "text-gold-700",
        )}
      >
        {children}
      </span>
      <Diamonds />
    </div>
  );
}

export function Heading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-display mt-4 text-[2.1rem] leading-[1.08] font-medium sm:text-5xl lg:text-[3.4rem]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Lead({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
        dark ? "text-sand-300" : "text-ink-500",
        className,
      )}
    >
      {children}
    </p>
  );
}

type ButtonTone = "gold" | "ink" | "ghost-dark" | "ghost-light";

const TONE: Record<ButtonTone, string> = {
  gold: "bg-gold-sheen text-ink-900 shadow-gold hover:brightness-105 active:brightness-95",
  ink: "bg-ink-900 text-cream-50 hover:bg-ink-800 active:bg-ink-700",
  "ghost-dark": "border border-white/20 text-sand-50 hover:border-white/40 hover:bg-white/5",
  "ghost-light": "border border-ink-900/15 bg-white/70 text-ink-900 hover:bg-white",
};

/** A link that looks like a button. Works in server components. */
export function LinkButton({
  href,
  tone = "gold",
  size = "lg",
  newTab,
  className,
  children,
}: {
  href: string;
  tone?: ButtonTone;
  size?: "md" | "lg";
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition",
    size === "lg" ? "h-13 px-7 text-[15px]" : "h-11 px-5 text-sm",
    TONE[tone],
    className,
  );
  if (href.startsWith("#")) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </Link>
  );
}

export function Tick({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
        dark ? "bg-gold-400/15 text-gold-300" : "bg-olive-100 text-olive-700",
        className,
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}
