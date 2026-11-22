import { cn } from "@/lib/format";

/**
 * Zaitoon's own logo (gold wordmark). "full" includes the white
 * FAMILY RESTAURANT line and belongs on dark backgrounds; "wordmark" works anywhere.
 */
export function Logo({
  variant = "wordmark",
  className,
}: {
  variant?: "full" | "wordmark";
  className?: string;
}) {
  const full = variant === "full";
  return (
    <img
      src={full ? "/brand/zaitoon-logo.png" : "/brand/zaitoon-wordmark.png"}
      alt="Zaitoon Family Restaurant"
      width={640}
      height={full ? 303 : 254}
      className={cn("h-10 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** The three diamonds from the logo: used as a small ornamental divider. */
export function Diamonds({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-hidden>
      <span className="h-px w-8 bg-gold-500/50" />
      <span className="size-1.5 rotate-45 bg-ember-500" />
      <span className="size-1.5 rotate-45 bg-leaf-500" />
      <span className="size-1.5 rotate-45 bg-ruby-500" />
      <span className="h-px w-8 bg-gold-500/50" />
    </span>
  );
}

/** Full-screen loading state shown while a screen wakes up. */
export function Splash({ label }: { label?: string }) {
  return (
    <div className="bg-ink-sheen fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 text-sand-300">
      <Logo variant="full" className="animate-fade h-24" />
      <div className="flex items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-gold-400" />
        <span className="size-1.5 animate-pulse rounded-full bg-gold-400 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-gold-400 [animation-delay:300ms]" />
      </div>
      {label && <p className="text-sm tracking-wide text-sand-500">{label}</p>}
    </div>
  );
}

export const dishImage = (slug: string | undefined, small = false) =>
  slug ? `/images/dishes/${slug}${small ? "-sm" : ""}.webp` : undefined;
