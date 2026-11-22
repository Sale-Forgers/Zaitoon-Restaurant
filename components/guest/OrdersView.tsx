"use client";

import { BookOpen, CircleCheck, ConciergeBell, Gift, Heart, ReceiptText, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Diamonds } from "@/components/brand";
import { Badge, Button, Card, Empty, Stars, Textarea, useToast } from "@/components/ui";
import { errorMessage, rpc } from "@/lib/client/rpc";
import { CALL_SHORT, clock, cn, firstName, rs } from "@/lib/format";
import { lineOptions } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { useGuestApp } from "./GuestProvider";
import { PushCard, Tracker } from "./parts";

const ACTIVE = ["received", "preparing", "ready", "picked_up"];

export function OrdersView() {
  const { state, table, session, loading } = useGuestApp();
  const toast = useToast();
  const params = useSearchParams();
  const rateRef = useRef<HTMLDivElement>(null);
  const [billBusy, setBillBusy] = useState(false);
  // Keeps the thank-you card on screen after the rating has been sent.
  const [thanked, setThanked] = useState(false);
  const wantsRating = params.get("rate") === "1";

  const orders = state?.orders ?? [];
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));
  const servedSomething = orders.some((o) => o.status === "served");
  const pending = state?.pendingFeedback ?? null;
  const showFeedback = Boolean(session.creds) && ((servedSomething && !state?.feedbackGiven) || Boolean(pending));

  // Arriving from the "rate your visit" notification: jump to the rating card.
  useEffect(() => {
    if (wantsRating && showFeedback) rateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [wantsRating, showFeedback]);

  if (!table && !pending) {
    return (
      <div className="px-4 pt-10">
        <Empty
          icon={<ScanLine className="size-6" />}
          title="No table linked yet"
          text="Scan the QR code on your table to order and follow your food from here."
        >
          <Link href="/menu">
            <Button variant="outline" icon={<BookOpen className="size-4" />}>
              Browse the menu
            </Button>
          </Link>
        </Empty>
      </div>
    );
  }

  if (loading && !state && table) {
    return (
      <div className="space-y-3 px-4 pt-6">
        <div className="skeleton h-56 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
      </div>
    );
  }

  const requestBill = async () => {
    if (!table) return;
    setBillBusy(true);
    try {
      await rpc("guest.call", { code: table.code, type: "bill" });
      toast({ title: "Bill requested", text: "Your waiter will bring it to your table." });
    } catch (e) {
      toast({ title: "Could not request the bill", text: errorMessage(e), tone: "error" });
    } finally {
      setBillBusy(false);
    }
  };

  // The bill was settled a little while ago and nothing new has been ordered.
  const ended = !state?.visit && orders.length === 0 ? (state?.recentVisit ?? null) : null;
  const visitOver = Boolean(ended) || (!state?.visit && Boolean(pending));

  return (
    <div className="space-y-4 px-4 pt-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-700 uppercase">
          {table ? `Table ${table.number} · ${table.zone}` : "Your visit"}
        </p>
        <h1 className="font-display text-[28px] leading-tight font-semibold">
          {visitOver ? "Thank you for dining with us" : active.length ? "Your food is on track" : "Your order"}
        </h1>
      </div>

      {ended && (
        <div className="bg-ink-sheen rounded-3xl p-6 text-center text-sand-50 shadow-lift">
          <Diamonds />
          <p className="font-display mt-4 text-2xl leading-tight font-semibold">
            We hope you enjoyed it{session.name ? `, ${firstName(session.name)}` : ""}
          </p>
          <p className="mt-2 text-sm text-sand-400">
            Table {ended.tableNumber} was closed at {clock(ended.closedAt)}
            {ended.total ? ` with a bill of ${rs(ended.total)}` : ""}. See you again soon at Zaitoon.
          </p>
          <Link href="/offers" className="mt-5 inline-block">
            <Button variant="gold" icon={<Gift className="size-4" />}>
              See our offers
            </Button>
          </Link>
        </div>
      )}

      {!visitOver && <PushCard />}

      {state?.calls.map((call) => (
        <div
          key={call.id}
          className={cn(
            "flex items-center gap-3 rounded-3xl px-4 py-3",
            call.status === "ack" ? "bg-leaf-50 text-leaf-700" : "bg-gold-100 text-gold-800",
          )}
        >
          <ConciergeBell className="size-5 shrink-0" />
          <p className="text-sm font-medium">
            {call.status === "ack"
              ? `${firstName(call.ackBy ?? "Your waiter")} is on the way to your table.`
              : `${CALL_SHORT[call.type]}: your waiter has been notified.`}
          </p>
        </div>
      ))}

      {active.map((order) => (
        <OrderCard key={order.id} order={order} live />
      ))}

      {orders.length === 0 && !visitOver && (
        <Card className="p-2">
          <Empty
            icon={<ReceiptText className="size-6" />}
            title="Nothing ordered yet"
            text="Pick your favourites from the menu and they will appear here with live updates."
          >
            <Link href="/menu">
              <Button variant="gold" icon={<BookOpen className="size-4" />}>
                Open the menu
              </Button>
            </Link>
          </Empty>
        </Card>
      )}

      {(showFeedback || thanked) && (
        <div ref={rateRef}>
          <FeedbackCard visitId={state?.visit?.id ?? pending?.visitId} onSent={() => setThanked(true)} />
        </div>
      )}
      {session.creds && state?.feedbackGiven && !pending && !thanked && (
        <div className="flex items-center gap-3 rounded-3xl bg-leaf-50 px-4 py-3 text-leaf-700">
          <Heart className="size-5 shrink-0 fill-current" />
          <p className="text-sm font-medium">Thank you for your feedback. It goes straight to the manager.</p>
        </div>
      )}

      {orders.length > 0 && state && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Table bill so far</h2>
            {state.visit?.billRequested && (
              <Badge tone="leaf">
                <CircleCheck className="size-3" /> Bill requested
              </Badge>
            )}
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            {(state.bill.service > 0 || state.bill.tax > 0) && (
              <Row label="Subtotal" value={rs(state.bill.subtotal)} />
            )}
            {state.bill.service > 0 && <Row label={`Service charge (${state.bill.servicePct}%)`} value={rs(state.bill.service)} />}
            {state.bill.tax > 0 && <Row label={`${state.bill.taxLabel} (${state.bill.taxPct}%)`} value={rs(state.bill.tax)} />}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display tabular text-2xl font-semibold">{rs(state.bill.total)}</dd>
            </div>
          </dl>
          {!state.visit?.billRequested && (
            <Button
              variant="outline"
              block
              className="mt-4"
              loading={billBusy}
              icon={<ReceiptText className="size-4" />}
              onClick={requestBill}
            >
              Ask for the bill
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-ink-400">Pay your waiter at the table: cash or card.</p>
        </Card>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-ink-400 uppercase">Earlier at this table</h2>
          <div className="space-y-3">
            {past.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-center pt-4">
        <Diamonds />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-500">
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function OrderCard({ order, live }: { order: Order; live?: boolean }) {
  return (
    <Card className={cn("overflow-hidden", live && "border-gold-400/40 shadow-lift")}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold">Order #{order.number}</span>
          {live && (
            <Badge tone="gold" dot>
              Live
            </Badge>
          )}
          {order.status === "served" && <Badge tone="leaf">Served</Badge>}
          {order.status === "cancelled" && <Badge tone="ruby">Cancelled</Badge>}
        </div>
        <span className="tabular text-xs text-ink-400">
          {clock(order.createdAt)} · {order.source === "waiter" ? "via waiter" : firstName(order.guestName)}
        </span>
      </div>

      {(live || order.status === "cancelled") && (
        <div className="px-5 pt-4">
          <Tracker order={order} />
        </div>
      )}

      <ul className="mt-4 divide-y divide-ink-900/6 border-t border-ink-900/6 px-5">
        {order.lines.map((l, i) => (
          <li key={i} className="flex gap-3 py-2.5 text-sm">
            <span className="tabular w-6 shrink-0 font-bold text-gold-700">{l.qty}×</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{l.name}</span>
              {lineOptions(l) && <span className="block text-[13px] text-ink-400">{lineOptions(l)}</span>}
              {l.note && <span className="block text-[13px] text-ember-600">“{l.note}”</span>}
            </span>
            <span className="tabular text-ink-500">{rs(l.total)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mx-5 mb-1 rounded-xl bg-cream-200 px-3 py-2 text-[13px] text-ink-500">Note: {order.note}</p>}
      <div className="flex items-center justify-between bg-cream-100/70 px-5 py-3 text-sm">
        <span className="text-ink-400">Order total</span>
        <span className="tabular font-bold">{rs(order.total)}</span>
      </div>
    </Card>
  );
}

function FeedbackCard({ visitId, onSent }: { visitId?: string; onSent: () => void }) {
  const toast = useToast();
  const { refresh } = useGuestApp();
  const [food, setFood] = useState(0);
  const [service, setService] = useState(0);
  const [ambience, setAmbience] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="bg-ink-sheen rounded-3xl p-6 text-center text-sand-50 shadow-lift">
        <div className="bg-gold-sheen mx-auto flex size-14 items-center justify-center rounded-full text-ink-900">
          <Heart className="size-7 fill-current" />
        </div>
        <p className="font-display mt-4 text-2xl font-semibold">Shukriya!</p>
        <p className="mt-1 text-sm text-sand-400">Your feedback goes straight to the manager. We hope to see you again soon.</p>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await rpc("guest.feedback", { visitId, food, service, ambience, comment });
      setDone(true);
      onSent();
      await refresh();
    } catch (e) {
      toast({ title: "Could not send your feedback", text: errorMessage(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const rating = (label: string, value: number, set: (n: number) => void) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-medium">{label}</span>
      <Stars value={value} onChange={set} size={30} />
    </div>
  );

  return (
    <Card className="border-gold-400/40 p-5 shadow-lift">
      <div className="flex items-center gap-3">
        <div className="bg-gold-sheen flex size-11 items-center justify-center rounded-2xl text-ink-900">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-xl leading-tight font-semibold">How was everything?</h2>
          <p className="text-[13px] text-ink-400">It takes ten seconds and helps us serve you better.</p>
        </div>
      </div>
      <div className="mt-5 space-y-3.5">
        {rating("Food", food, setFood)}
        {rating("Service", service, setService)}
        {rating("Ambience", ambience, setAmbience)}
      </div>
      <Textarea
        className="mt-4 min-h-20"
        maxLength={500}
        placeholder="Anything you would like to tell us? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        variant="gold"
        size="lg"
        block
        className="mt-3"
        loading={busy}
        disabled={!food || !service || !ambience}
        onClick={submit}
      >
        Send feedback
      </Button>
    </Card>
  );
}
