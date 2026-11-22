"use client";

import { BellRing, Check, History, Megaphone, Send, ShieldCheck, Smartphone, Sparkles, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, Input, Label, Textarea, useToast } from "@/components/ui";
import { useLive, useSlowNow } from "@/lib/client/live";
import { rpc } from "@/lib/client/rpc";
import { clock, cn, dateTime } from "@/lib/format";
import type { Audience, Campaign } from "@/lib/types";
import { useBoard } from "./AdminShell";
import { LoadError, PageHeader, Panel, SampleTag, SkeletonList, useAction, useConfirm } from "./parts";

const TITLE_MAX = 60;
const BODY_MAX = 180;

const AUDIENCES: { value: Audience; label: string; text: string }[] = [
  { value: "all", label: "All guests", text: "Everyone who agreed to receive offers" },
  { value: "recent", label: "Visited in the last 30 days", text: "Guests who dined with you recently" },
  { value: "loyal", label: "Loyal guests", text: "Three or more visits, or Rs 10,000 spent" },
];

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "All guests",
  recent: "Recent guests",
  loyal: "Loyal guests",
};

const devices = (n: number) => `${n} ${n === 1 ? "phone" : "phones"}`;

export function NotificationsPage() {
  const board = useBoard();
  const campaigns = useLive(() => rpc("admin.campaigns"), "campaigns");
  const toast = useToast();
  const confirm = useConfirm();
  const { run, busy } = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");

  const phone = board.data?.settings.restaurant.phone ?? "";
  const templates = [
    {
      name: "Weekend BBQ night",
      title: "BBQ night on the rooftop",
      body: `This weekend: sizzling BBQ platters under the lights at Zaitoon.${phone ? ` Call ${phone} to reserve your table.` : ""}`,
    },
    {
      name: "We missed you",
      title: "We missed you at Zaitoon",
      body: "It has been a while! Come by this week for your favourite karahi, fresh from the wok and the tandoor.",
    },
    {
      name: "New dish",
      title: "New on the menu",
      body: "Our chefs have something new for you. Ask your waiter about today's special on your next visit.",
    },
    {
      name: "Family dinner tonight",
      title: "Dinner with the family tonight?",
      body: "Tables are open in the family hall and on the rooftop. See you at Zaitoon!",
    },
  ];

  const data = campaigns.data;
  const reach = data?.reach[audience] ?? 0;
  const ready = title.trim().length >= 3 && body.trim().length >= 3;

  const noPhonesYet = () =>
    toast({
      tone: "info",
      title: "No phones to deliver to yet",
      text: "Guests subscribe when they scan a table and tap “Turn on notifications”.",
    });

  const send = async () => {
    if (!reach) return noPhonesYet();
    const ok = await confirm({
      title: `Send this to ${devices(reach)}?`,
      text: (
        <>
          <b className="text-ink-900">{title.trim()}</b>
          <br />
          {body.trim()}
        </>
      ),
      confirmLabel: "Send now",
    });
    if (!ok) return;
    const sent = await run("send", () => rpc("admin.campaign.send", { title, body, audience }));
    if (!sent) return;
    if (!sent.targeted) return noPhonesYet();
    toast({
      title: `Delivered to ${sent.delivered} of ${devices(sent.targeted)}`,
      text: sent.failed ? `${sent.failed} could not be reached and will be skipped next time.` : undefined,
    });
    if (sent.delivered) {
      setTitle("");
      setBody("");
    }
  };

  const test = async () => {
    const res = await run("test", () => rpc("admin.push.test"));
    if (!res) return;
    if (!res.sent && !res.failed) return noPhonesYet();
    toast(
      res.sent
        ? { title: `Test sent to ${devices(res.sent)}`, text: "It should appear within a few seconds." }
        : { tone: "error", title: "The test could not be delivered", text: "The phone may be offline or may have switched notifications off." },
    );
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Reach your guests on their phone, at the table or at home. No app to install and no charge per message."
      />

      {!data ? (
        campaigns.error ? (
          <LoadError error={campaigns.error} retry={campaigns.refresh} />
        ) : (
          <SkeletonList rows={5} />
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <Panel
              title="Write a message"
              subtitle={
                data.subscribers
                  ? `${devices(data.subscribers)} ${data.subscribers === 1 ? "has" : "have"} notifications switched on.`
                  : "No guest has switched notifications on yet."
              }
            >
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Start from an idea</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setTitle(t.title);
                      setBody(t.body);
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-ink-900/12 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-700 transition hover:border-gold-500 hover:text-ink-900"
                  >
                    <Sparkles className="size-3.5 text-gold-600" /> {t.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <Label hint={`${title.length}/${TITLE_MAX}`}>Title</Label>
                  <Input value={title} maxLength={TITLE_MAX} placeholder="Something worth opening" onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="block">
                  <Label hint={`${body.length}/${BODY_MAX}`}>Message</Label>
                  <Textarea value={body} maxLength={BODY_MAX} placeholder="Tell them the offer and what to do next" onChange={(e) => setBody(e.target.value)} />
                </label>

                <div>
                  <Label>Who receives it</Label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {AUDIENCES.map((a) => {
                      const active = audience === a.value;
                      return (
                        <button
                          key={a.value}
                          role="radio"
                          aria-checked={active}
                          onClick={() => setAudience(a.value)}
                          className={cn(
                            "relative flex flex-col rounded-2xl border p-3.5 text-left transition",
                            active ? "border-ink-900 bg-ink-900 text-cream-50 shadow-soft" : "border-ink-900/12 bg-white hover:border-ink-900/35",
                          )}
                        >
                          {active && (
                            <span className="bg-gold-sheen absolute top-3 right-3 flex size-5 items-center justify-center rounded-full text-ink-900">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          )}
                          <p className="pr-6 text-sm font-semibold">{a.label}</p>
                          <p className={cn("mt-0.5 text-xs", active ? "text-sand-300" : "text-ink-400")}>{a.text}</p>
                          <p className={cn("font-display tabular mt-auto pt-3 text-2xl leading-none font-semibold", active ? "text-gold-300" : "text-ink-900")}>
                            {data.reach[a.value]}
                          </p>
                          <p className={cn("mt-1 text-[11px]", active ? "text-sand-400" : "text-ink-400")}>
                            {data.reach[a.value] === 1 ? "phone will get it" : "phones will get it"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="gold" size="lg" icon={<Send className="size-4" />} disabled={!ready} loading={busy === "send"} onClick={send}>
                  {reach ? `Send to ${devices(reach)}` : "Send notification"}
                </Button>
                <Button variant="outline" size="lg" icon={<BellRing className="size-4" />} loading={busy === "test"} onClick={test}>
                  Send a test
                </Button>
              </div>
              {!reach && (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-400">
                  Nobody in this group can be reached yet. Guests join it when they scan their table, enter their name and tap
                  “Turn on notifications”. Try it with your own phone, then send the test.
                </p>
              )}
            </Panel>

            <LockScreen title={title.trim()} body={body.trim()} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <Panel title="Sent so far" subtitle="Every promotion, with how many phones it reached" flush>
              {data.campaigns.length === 0 ? (
                <Empty icon={<History className="size-6" />} title="Nothing sent yet" text="Your promotions will be listed here with their delivery numbers." />
              ) : (
                <ul className="divide-y divide-ink-900/6">
                  {data.campaigns.map((c) => (
                    <CampaignRow key={c.id} campaign={c} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="How it works" subtitle="Plain facts for you and your guests">
              <ul className="space-y-4 text-[13px] leading-relaxed text-ink-600">
                <Point icon={<Smartphone className="size-4" />} title="No app to install">
                  Guests tap “Turn on notifications” once, inside the menu page they opened by scanning the table.
                </Point>
                <Point icon={<ShieldCheck className="size-4" />} title="No company in the middle">
                  Messages travel from your own system to the phone through the open Web Push standard, signed with your own keys.
                  There is no Firebase or OneSignal account and no price per message.
                </Point>
                <Point icon={<Zap className="size-4" />} title="Works after they have left">
                  The phone shows your message even when the menu page is closed or the screen is locked.
                </Point>
                <Point icon={<Users className="size-4" />} title="Android, computers and iPhone">
                  Android phones and computers receive notifications straight from the browser. On iPhone, Apple only allows them
                  after the guest adds Zaitoon to the Home Screen; the menu page shows them how.
                </Point>
                <Point icon={<Megaphone className="size-4" />} title="Only for guests who agreed">
                  Promotions go to guests who said yes to offers. Order updates go to everyone who switched notifications on.
                </Point>
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

/** How the message will look on a guest's locked phone. */
function LockScreen({ title, body }: { title: string; body: string }) {
  const now = useSlowNow();
  const date = now ? new Date(now).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" }) : "";
  return (
    <Card className="flex flex-col items-center gap-5 px-6 pt-6 pb-7">
      <p className="self-start text-[11px] font-semibold tracking-wider text-ink-400 uppercase">On the guest&apos;s phone</p>
      <div className="my-auto w-[290px] rounded-[46px] bg-ink-900 p-2.5 shadow-lift">
        <div className="relative h-[520px] overflow-hidden rounded-[36px] bg-ink-800">
          <img src="/images/venue/rooftop-night.webp" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/55 via-ink-950/25 to-ink-950/75" />
          <div className="absolute top-2.5 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          <div className="relative flex h-full flex-col px-3.5 pt-14 pb-5 text-white">
            <p className="text-center text-sm font-medium opacity-90">{date}</p>
            <p className="tabular text-center text-[58px] leading-none font-semibold tracking-tight">{now ? clock(now).replace(/\s?[AP]M/i, "") : ""}</p>

            <div className="animate-rise mt-9 rounded-[22px] bg-white/80 p-3 text-ink-900 shadow-lift backdrop-blur-xl" key={`${title}|${body}`}>
              <div className="flex items-center gap-2">
                <img src="/icons/icon-192.png" alt="" className="size-5 rounded-md" />
                <p className="text-[11px] font-semibold tracking-wide text-ink-500 uppercase">Zaitoon</p>
                <p className="ml-auto text-[11px] text-ink-400">now</p>
              </div>
              <p className={cn("mt-1.5 text-sm leading-snug font-semibold", !title && "text-ink-300")}>{title || "Your title appears here"}</p>
              <p className={cn("mt-0.5 line-clamp-4 text-[13px] leading-snug", body ? "text-ink-700" : "text-ink-300")}>
                {body || "Your message appears here, exactly as guests will read it."}
              </p>
            </div>

            <div className="mt-auto flex justify-center">
              <span className="h-1 w-28 rounded-full bg-white/80" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-ink-400">A tap opens Zaitoon&apos;s offers page on the guest&apos;s phone.</p>
    </Card>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const full = campaign.targeted > 0 && campaign.delivered === campaign.targeted;
  return (
    <li className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
        <Megaphone className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
          {campaign.title}
          {campaign.sample && <SampleTag />}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{campaign.body}</p>
        <p className="mt-1.5 text-xs text-ink-400">
          {dateTime(campaign.sentAt)} · {AUDIENCE_LABEL[campaign.audience]}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("font-display tabular text-xl leading-none font-semibold", full ? "text-leaf-600" : "text-ink-900")}>
          {campaign.delivered}
          <span className="text-sm text-ink-300"> / {campaign.targeted}</span>
        </p>
        <p className="mt-1 text-[11px] text-ink-400">delivered</p>
      </div>
    </li>
  );
}

function Point({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-ink-900/6 text-ink-600">{icon}</span>
      <p>
        <b className="block text-sm text-ink-900">{title}</b>
        {children}
      </p>
    </li>
  );
}
