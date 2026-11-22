"use client";

import { Search, TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Badge, Button, Card, Sheet, useToast } from "@/components/ui";
import { errorMessage } from "@/lib/client/rpc";
import { cn, initials, STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

// ───────────────────────────── Layout pieces ─────────────────────────────

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-semibold text-ink-900 sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Let the content run edge to edge (lists, tables). */
  flush?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-1 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg leading-snug font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-400">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col", flush ? "pt-3" : "px-5 pt-4 pb-5 sm:px-6 sm:pb-6")}>{children}</div>
    </Card>
  );
}

type StatTone = "plain" | "gold" | "leaf" | "ember" | "ruby" | "sky" | "olive";
const STAT_ICON: Record<StatTone, string> = {
  plain: "bg-ink-900/6 text-ink-600",
  gold: "bg-gold-100 text-gold-700",
  leaf: "bg-leaf-100 text-leaf-700",
  ember: "bg-ember-100 text-ember-700",
  ruby: "bg-ruby-100 text-ruby-600",
  sky: "bg-sky-100 text-sky-600",
  olive: "bg-olive-100 text-olive-700",
};

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "plain",
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-400">{label}</p>
        {icon && (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", STAT_ICON[tone])}>{icon}</span>
        )}
      </div>
      <p className="font-display tabular mt-2 text-[28px] leading-none font-semibold text-ink-900">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-400">{hint}</p>}
      {children}
    </Card>
  );
}

// ───────────────────────────── Small pieces ─────────────────────────────

const STATUS_TONE: Record<OrderStatus, "sky" | "gold" | "leaf" | "olive" | "neutral" | "ruby"> = {
  received: "sky",
  preparing: "gold",
  ready: "leaf",
  picked_up: "olive",
  served: "neutral",
  cancelled: "ruby",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Marks records that belong to the pre-loaded demo history. */
export function SampleTag() {
  return (
    <span className="rounded-full border border-dashed border-ink-900/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-400 uppercase">
      Sample
    </span>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-300" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-ink-900/12 bg-white pr-4 pl-11 text-sm text-ink-900 transition placeholder:text-ink-300 focus:border-gold-500 focus:ring-4 focus:ring-gold-200/60 focus:outline-none"
      />
    </label>
  );
}

const AVATAR_TONES = [
  "bg-gold-100 text-gold-800",
  "bg-olive-100 text-olive-700",
  "bg-ember-100 text-ember-700",
  "bg-sky-100 text-sky-600",
  "bg-ruby-100 text-ruby-600",
  "bg-ink-900/8 text-ink-600",
];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  // The same name always gets the same colour.
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "size-8 text-[11px]" : "size-10 text-[13px]",
        AVATAR_TONES[hash % AVATAR_TONES.length],
      )}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

export function Notice({
  tone = "warn",
  title,
  children,
  action,
}: {
  tone?: "warn" | "info";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-3xl border px-5 py-4",
        tone === "warn" ? "border-ember-400/40 bg-ember-50 text-ember-700" : "border-sky-400/30 bg-sky-50 text-sky-600",
      )}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function LoadError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <TriangleAlert className="size-7 text-ember-500" />
      <p className="font-display text-lg font-semibold">This page could not load</p>
      <p className="max-w-sm text-sm text-ink-400">{errorMessage(error)}</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </Card>
  );
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className ?? "grid-cols-2 lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-28 rounded-3xl" />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  );
}

/** Rs 42,500 → "42.5k": for chart labels where space is tight. */
export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

// ───────────────────────────── Actions ─────────────────────────────

/**
 * Runs a server call with a busy flag, a success toast and an error toast.
 * `busy` holds the key of the action in flight so the right button can spin.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(
      key: string,
      fn: () => Promise<T>,
      done?: string | ((result: T) => string | null | undefined | void),
    ): Promise<T | undefined> => {
      setBusy(key);
      try {
        const result = await fn();
        const message = typeof done === "function" ? done(result) : done;
        if (message) toast({ title: message });
        return result;
      } catch (e) {
        toast({ title: errorMessage(e), tone: "error" });
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  return { run, busy };
}

// ───────────────────────────── Confirm dialog ─────────────────────────────

interface ConfirmOptions {
  title: string;
  text?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );
  const answer = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );
  const cancel = useCallback(() => answer(false), [answer]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={Boolean(pending)}
        onClose={cancel}
        title={pending?.title ?? ""}
        size="sm"
        footer={
          <div className="flex gap-3 pb-1">
            <Button variant="outline" block onClick={cancel}>
              Cancel
            </Button>
            <Button variant={pending?.danger ? "danger" : "ink"} block onClick={() => answer(true)}>
              {pending?.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        }
      >
        {pending?.text && <div className="text-sm leading-relaxed text-ink-500">{pending.text}</div>}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
