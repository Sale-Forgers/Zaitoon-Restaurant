"use client";

import { Check, LoaderCircle, Minus, Plus, Star, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/format";

// ───────────────────────────── Client-only gate ─────────────────────────────

const noop = () => () => {};

/** True only in the browser after hydration: used for anything that needs the device. */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useMounted() ? <>{children}</> : <>{fallback}</>;
}

// ───────────────────────────── Buttons ─────────────────────────────

type Variant = "gold" | "ink" | "outline" | "ghost" | "soft" | "danger" | "leaf" | "dark";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANT: Record<Variant, string> = {
  gold: "bg-gold-sheen text-ink-900 shadow-gold hover:brightness-105 active:brightness-95",
  ink: "bg-ink-900 text-cream-50 hover:bg-ink-800 active:bg-ink-700 shadow-soft",
  outline: "border border-ink-900/15 bg-white/60 text-ink-900 hover:bg-white active:bg-cream-200",
  ghost: "text-ink-700 hover:bg-ink-900/5 active:bg-ink-900/10",
  soft: "bg-ink-900/5 text-ink-900 hover:bg-ink-900/10 active:bg-ink-900/15",
  danger: "bg-ruby-500 text-white hover:bg-ruby-600 active:bg-ruby-700",
  leaf: "bg-leaf-500 text-white hover:bg-leaf-600 active:bg-leaf-700",
  dark: "bg-white/10 text-sand-50 hover:bg-white/15 active:bg-white/20 border border-white/10",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-6 text-[15px] gap-2",
  xl: "h-15 px-7 text-base gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "ink",
  size = "md",
  loading,
  block,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-semibold tracking-tight transition",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full transition",
        "hover:bg-ink-900/5 active:bg-ink-900/10 disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ───────────────────────────── Small pieces ─────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin text-gold-500", className)} />;
}

type Tone = "neutral" | "gold" | "leaf" | "ember" | "ruby" | "sky" | "olive" | "dark";
const TONE: Record<Tone, string> = {
  neutral: "bg-ink-900/6 text-ink-600",
  gold: "bg-gold-100 text-gold-800",
  leaf: "bg-leaf-100 text-leaf-700",
  ember: "bg-ember-100 text-ember-700",
  ruby: "bg-ruby-100 text-ruby-700",
  sky: "bg-sky-100 text-sky-600",
  olive: "bg-olive-100 text-olive-700",
  dark: "bg-ink-900 text-gold-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none tracking-wide",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl border border-ink-900/6 bg-white shadow-soft", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  children,
  dark,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div
          className={cn(
            "mb-4 flex size-14 items-center justify-center rounded-2xl",
            dark ? "bg-white/6 text-sand-400" : "bg-ink-900/5 text-ink-400",
          )}
        >
          {icon}
        </div>
      )}
      <p className={cn("font-display text-lg font-semibold", dark ? "text-sand-100" : "text-ink-900")}>{title}</p>
      {text && <p className={cn("mt-1 max-w-xs text-sm", dark ? "text-sand-500" : "text-ink-400")}>{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

// ───────────────────────────── Form controls ─────────────────────────────

const FIELD =
  "w-full rounded-2xl border border-ink-900/12 bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-300 " +
  "transition focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-200/60 disabled:bg-cream-200";

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink-700">
      {children}
      {hint && <span className="font-normal text-ink-400">{hint}</span>}
    </span>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, "h-12", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "min-h-24 resize-none py-3", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "h-12 appearance-none bg-[length:16px] pr-10", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50",
        checked ? "bg-leaf-500" : "bg-ink-900/15",
      )}
    >
      <span
        className={cn(
          "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  dark,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full p-1",
        dark ? "bg-white/8" : "bg-ink-900/6",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-4 py-2 text-[13px] font-semibold transition",
            value === o.value
              ? dark
                ? "bg-gold-sheen text-ink-900"
                : "bg-ink-900 text-cream-50 shadow-soft"
              : dark
                ? "text-sand-300 hover:text-sand-50"
                : "text-ink-500 hover:text-ink-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 50,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const b = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center rounded-full bg-ink-900 text-cream-50">
      <button
        type="button"
        aria-label="Less"
        className={cn(b, "flex items-center justify-center rounded-full transition active:bg-white/15 disabled:opacity-40")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="size-4" />
      </button>
      <span className={cn("tabular text-center font-bold", size === "sm" ? "w-6 text-sm" : "w-8")}>{value}</span>
      <button
        type="button"
        aria-label="More"
        className={cn(b, "flex items-center justify-center rounded-full transition active:bg-white/15 disabled:opacity-40")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="inline-flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={cn("transition", on ? "fill-gold-400 text-gold-400" : "fill-transparent text-ink-900/20")}
            strokeWidth={1.6}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="transition active:scale-90"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  dark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  dark?: boolean;
}) {
  const box = dark
    ? checked
      ? "border-gold-300 bg-gold-300 text-ink-900"
      : "border-white/30 bg-transparent"
    : checked
      ? "border-ink-900 bg-ink-900 text-gold-300"
      : "border-ink-900/25 bg-white";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition", box)}>
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className={cn("text-sm", dark ? "text-sand-300" : "text-ink-600")}>{children}</span>
    </button>
  );
}

// ───────────────────────────── Sheet / modal ─────────────────────────────

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  dark,
  flush,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  /** Remove the default body padding (for image headers). */
  flush?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Callers usually pass a fresh arrow function on every render. Keeping it in a
  // ref means the effect below runs only when the sheet opens or closes; otherwise
  // it would re-focus the panel on every keystroke and steal focus from inputs.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const width = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-ink-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "animate-sheet sm:animate-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-lift outline-none sm:rounded-[28px]",
          dark ? "bg-ink-800 text-sand-50" : "bg-cream-50 text-ink-900",
          width,
        )}
      >
        {title !== undefined && (
          <div className={cn("flex items-center justify-between gap-3 px-5 pt-5 pb-3", dark ? "" : "")}>
            <div className="font-display text-xl font-semibold">{title}</div>
            <IconButton label="Close" onClick={onClose} className={dark ? "hover:bg-white/10" : ""}>
              <X className="size-5" />
            </IconButton>
          </div>
        )}
        <div className={cn("thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain", !flush && "px-5 pb-5")}>
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              "safe-bottom border-t px-5 pt-4",
              dark ? "border-white/8 bg-ink-800" : "border-ink-900/8 bg-cream-50",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Toasts ─────────────────────────────

interface ToastItem {
  id: number;
  title: string;
  text?: string;
  tone: "ok" | "error" | "info";
}

const ToastContext = createContext<(t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastItem["tone"] }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback((t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastItem["tone"] }) => {
    const id = next.current++;
    setItems((list) => [...list.slice(-2), { id, tone: t.tone ?? "ok", title: t.title, text: t.text }]);
    window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 5200 : 3600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-lift",
              t.tone === "error" ? "bg-ruby-600 text-white" : "bg-ink-900 text-cream-50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                t.tone === "error" ? "bg-white/20" : t.tone === "info" ? "bg-gold-400 text-ink-900" : "bg-leaf-500",
              )}
            >
              {t.tone === "error" ? <X className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.text && <p className="mt-0.5 text-[13px] opacity-80">{t.text}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
