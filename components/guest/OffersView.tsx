"use client";

import { Clock, Gift, MapPin, Megaphone, Phone, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Diamonds } from "@/components/brand";
import { Card, Empty, Toggle, useToast } from "@/components/ui";
import { forgetGuest, setGuest } from "@/lib/client/guest";
import { useLive, useSlowNow } from "@/lib/client/live";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { ago, cn } from "@/lib/format";
import { useGuestApp } from "./GuestProvider";
import { PushCard } from "./parts";

/** Offers from the restaurant plus the guest's notification preferences. */
export function OffersView() {
  const { state, session, refresh } = useGuestApp();
  const toast = useToast();
  const now = useSlowNow();
  const highlight = useSearchParams().get("c");
  const offers = useLive(() => rpc("offers.list"), "offers");
  const guest = state?.guest;
  const info = state?.settings.restaurant;

  const setMarketing = async (marketing: boolean) => {
    try {
      await rpc("guest.marketing", { marketing });
      await refresh();
      toast({ title: marketing ? "You will receive our offers" : "Offers turned off" });
    } catch (e) {
      toast({ title: "Could not update", text: errorMessage(e), tone: "error" });
    }
  };

  return (
    <div className="space-y-4 px-4 pt-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-700 uppercase">From Zaitoon</p>
        <h1 className="font-display text-[28px] leading-tight font-semibold">Offers &amp; news</h1>
      </div>

      <PushCard />

      {offers.data && offers.data.length > 0 ? (
        <div className="space-y-3">
          {offers.data.map((o, i) => {
            const featured = o.id === highlight || (!highlight && i === 0);
            return (
              <article
                key={o.id}
                className={cn(
                  "rounded-3xl border p-5",
                  featured
                    ? "border-gold-400/50 bg-gradient-to-br from-gold-50 to-gold-100 shadow-lift"
                    : "border-ink-900/6 bg-white shadow-soft",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                      featured ? "bg-gold-sheen text-ink-900" : "bg-gold-100 text-gold-700",
                    )}
                  >
                    <Gift className="size-5" />
                  </div>
                  <div className="min-w-0">
                    {featured && (
                      <p className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-gold-700 uppercase">Latest offer</p>
                    )}
                    <h2 className="font-display text-xl leading-tight font-semibold">{o.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{o.body}</p>
                    <p className="mt-2 text-xs text-ink-300">{now ? ago(o.sentAt, now) : ""}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : offers.loading ? (
        <div className="space-y-3">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
      ) : (
        <Card className="p-2">
          <Empty
            icon={<Megaphone className="size-6" />}
            title="No offers right now"
            text="Turn on notifications and we will let you know about new dishes and special nights."
          />
        </Card>
      )}

      {guest && (
        <Card className="divide-y divide-ink-900/6">
          <div className="flex items-center gap-3 p-4">
            <div className="flex size-11 items-center justify-center rounded-full bg-ink-900 text-gold-300">
              <UserRound className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{guest.name}</p>
              <p className="text-xs text-ink-400">
                {guest.visits} {guest.visits === 1 ? "visit" : "visits"} · this phone is remembered
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-[15px] font-medium">Offers and discounts</p>
              <p className="text-xs text-ink-400">Occasional news from Zaitoon. Order updates are not affected.</p>
            </div>
            <Toggle checked={guest.marketing} onChange={setMarketing} label="Receive offers" />
          </div>
          <button
            onClick={() => {
              if (!window.confirm("Remove your name and table from this phone?")) return;
              forgetGuest();
              setGuest({ table: null });
              toast({ title: "This phone has been reset" });
            }}
            className="w-full p-4 text-left text-sm font-medium text-ink-400 hover:text-ruby-600"
          >
            Not {session.name?.split(" ")[0] ?? "you"}? Reset this phone
          </button>
        </Card>
      )}

      {info && (
        <Card className="space-y-3 p-5 text-sm text-ink-600">
          <h2 className="font-display text-xl font-semibold text-ink-900">{info.name}</h2>
          <p className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" /> {info.address}
          </p>
          <p className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-gold-600" /> {info.hours}
          </p>
          <a href={`tel:${info.phone.replace(/\s/g, "")}`} className="flex gap-3 font-semibold text-ink-900">
            <Phone className="mt-0.5 size-4 shrink-0 text-gold-600" /> {info.phone}
          </a>
        </Card>
      )}

      <div className="flex justify-center pt-4">
        <Diamonds />
      </div>
    </div>
  );
}
