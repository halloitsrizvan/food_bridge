"use client";

import { ArrowUpRight, Landmark, ChevronLeft, ChevronRight, Carrot, Drumstick, Handshake, HeartHandshake, Leaf, Package, Plus, Radar, Salad, Soup, Timer, } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Logo } from "@/components/layout/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMe, useOffers } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import { t } from "@/lib/i18n/en";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { setFeedFilter } from "./nav";

function ArrowPill({ children, href, onClick, tone = "teal" }: { children: React.ReactNode; href?: string; onClick?: () => void; tone?: "teal" | "light" }) {
  const cls = cn(buttonVariants(), "h-10 gap-2 pl-4 pr-1.5 text-sm", tone === "light" && "bg-background text-primary hover:bg-background/90");
  const icon = (
    <span className={cn("grid size-7 place-items-center rounded-full", tone === "light" ? "bg-primary text-primary-foreground" : "bg-background text-primary")}>
      <ArrowUpRight className="size-3.5" aria-hidden />
    </span>
  );
  return href ? (
    <Link href={href} className={cls}>{children}{icon}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{children}{icon}</button>
  );
}

export function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-semibold sm:text-4xl">{title}</h2>
      {action}
    </div>
  );
}

const CATS = [
  { label: "Cooked meals", sub: "Safe for 4 hours", icon: Salad, bg: "bg-[#fdeee6]", fg: "text-[#c2562b]", f: { category: "COOKED" } },
  { label: "Vegetarian", sub: "Plant based", icon: Leaf, bg: "bg-[#e8f5ec]", fg: "text-[#1d7a45]", f: { diet: "VEG" } },
  { label: "Non-veg", sub: "Meat and fish", icon: Drumstick, bg: "bg-[#fdebe9]", fg: "text-[#c0392b]", f: { diet: "NON_VEG" } },
  { label: "Packaged", sub: "Breads, snacks, drinks", icon: Package, bg: "bg-[#eaf2fc]", fg: "text-[#2f6fb5]", f: { category: "PACKAGED" } },
  { label: "Raw produce", sub: "Safe for 24 hours", icon: Carrot, bg: "bg-[#fff3dc]", fg: "text-[#b7791f]", f: { category: "RAW" } },
];

export function ExploreCategories() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 280, behavior: "smooth" });
  return (
    <section className="mx-auto max-w-[1680px] px-4 sm:px-8 py-14">
      <SectionHead
        title="Explore Categories"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="size-10" aria-label="Scroll left" onClick={() => scroll(-1)}><ChevronLeft /></Button>
            <Button size="icon" className="size-10" aria-label="Scroll right" onClick={() => scroll(1)}><ChevronRight /></Button>
          </div>
        }
      />
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <button key={c.label} type="button" onClick={() => setFeedFilter(c.f)} className={cn("group flex min-h-[13rem] w-56 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-[20px] p-5 text-center transition-transform hover:-translate-y-1", c.bg)}>
            <span className={cn("grid size-24 place-items-center rounded-full bg-white/70 transition-transform group-hover:scale-105", c.fg)}>
              <c.icon className="size-12" strokeWidth={1.6} aria-hidden />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-[#212529]">{c.label}</span>
              <span className="text-sm text-[#667085]">{c.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PromoBanners() {
  const { data: me } = useMe();
  return (
    <section className="mx-auto grid max-w-[1680px] px-4 sm:px-8 gap-4 py-6 lg:grid-cols-[1fr_1.7fr]">
      <div className="grid gap-4">
        <div className="relative overflow-hidden rounded-[20px] p-6 text-white" style={{ background: "linear-gradient(135deg,#6c5ce7,#8e7cf3)" }}>
          <h3 className="font-display text-2xl font-semibold">Click. Share. Smile.</h3>
          <p className="mb-5 mt-1 max-w-[14rem] text-sm text-white/80">Posting surplus takes under a minute.</p>
          <ArrowPill href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"}>Share now</ArrowPill>
          <Soup className="absolute -bottom-4 -right-3 size-32 rotate-12 text-white/25" aria-hidden />
        </div>
        <div className="relative overflow-hidden rounded-[20px] p-6 text-white" style={{ background: "linear-gradient(135deg,#e8913a,#f4b66a)" }}>
          <h3 className="font-display text-2xl font-semibold">Feed a family tonight</h3>
          <p className="mb-5 mt-1 max-w-[14rem] text-sm text-white/90">Charities and homes request food nearby.</p>
          <ArrowPill href="/signup" tone="light">Request food</ArrowPill>
          <HeartHandshake className="absolute -bottom-4 -right-3 size-32 -rotate-12 text-white/30" aria-hidden />
        </div>
      </div>
      <div className="relative min-h-[22rem] overflow-hidden rounded-[20px] p-8 text-white sm:p-10" style={{ background: "linear-gradient(120deg,#0a8fc4 0%,#27b3d9 60%,#7fd6ea 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/85">
          Free for everyone <span className="text-saffron">· Government run</span>
        </p>
        <h3 className="mt-3 max-w-md text-balance font-display text-4xl font-semibold leading-[1.05] sm:text-5xl">Fresh meals from kitchen to your community</h3>
        <p className="mb-6 mt-4 max-w-sm text-sm text-white/90">Every handover is verified with a one-time code and a shareable certificate.</p>
        <ArrowPill href="#live" tone="light">Browse food</ArrowPill>
        <Soup className="absolute -bottom-10 -right-6 size-64 text-white/20" strokeWidth={1.2} aria-hidden />
      </div>
    </section>
  );
}

function CountBox({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-lg border bg-secondary py-1.5 text-center">
      <p className="font-display text-lg font-semibold tabular text-clay">{n}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

export function ExpiringDeals() {
  const now = useNow();
  const { data } = useOffers({ sort: "soonest", maxMinutesLeft: 480, limit: 2 });
  if (!data?.items.length) return null;
  return (
    <section id="deals" className="mx-auto max-w-[1680px] px-4 sm:px-8 scroll-mt-32 py-14">
      <SectionHead title="Limited-Time Deals" action={<span className="rounded-full bg-clay/10 px-4 py-2 text-sm font-semibold text-clay"><Timer className="mr-1 inline size-4" aria-hidden />Food is spoiling, claim now</span>} />
      <div className="grid gap-4 md:grid-cols-2">
        {data.items.map((o) => {
          const ms = now ? Math.max(0, new Date(o.expiresAt).getTime() - now) : 0;
          const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000);
          const pad = (n: number) => String(n).padStart(2, "0");
          const total = Math.max(1, new Date(o.expiresAt).getTime() - new Date(o.createdAt).getTime());
          const pct = Math.min(1, ms / total);
          return (
            <article key={o.id} className="flex flex-col gap-4 rounded-[20px] border bg-background p-4 sm:flex-row">
              <div className="grid size-full min-h-40 place-items-center rounded-2xl bg-secondary sm:size-44 sm:shrink-0">
                <Salad className="size-16 text-primary" strokeWidth={1.4} aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <h3 className="truncate font-display text-lg font-semibold">{o.title}</h3>
                <p className="text-sm text-muted-foreground">{o.giverName} · {o.area}</p>
                <div className="grid grid-cols-4 gap-2" role="timer" aria-label={`${formatLeft(ms)} left`}>
                  <CountBox n={pad(d)} label="Day" /><CountBox n={pad(h)} label="Hour" /><CountBox n={pad(m)} label="Min" /><CountBox n={pad(s)} label="Sec" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>This food is about to run out</span><span>Meals: <b className="text-clay">{o.quantityMeals}</b></span></div>
                  <div className="flex h-2 gap-[3px]" aria-hidden>
                    {Array.from({ length: 20 }, (_, i) => <span key={i} className={cn("flex-1 rounded-sm", i < Math.round(pct * 20) ? "bg-primary" : "bg-primary/15")} />)}
                  </div>
                </div>
                <Link href={`/dashboard/offers/${o.id}`} className={cn(buttonVariants(), "h-10 w-full")}>Request this food</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: HeartHandshake, title: "Share surplus", body: "Givers post what is left, with the cooking time. We compute exactly how long it stays safe." },
    { icon: Radar, title: "We find the nearest safe match", body: "Only receivers who can arrive before it spoils are alerted, ranked by distance, time, quantity and trust." },
    { icon: Handshake, title: "Hand over with a code", body: "Both sides agree, the giver shows a 6-digit code, the receiver enters it at pickup. Points follow." },
  ];
  return (
    <section id="how" className="mx-auto max-w-[1680px] px-4 sm:px-8 scroll-mt-32 py-14">
      <SectionHead title={t.landing.how} />
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-[20px] border bg-background p-6">
            <span className="absolute right-5 top-3 font-display text-6xl font-semibold text-primary/10">{i + 1}</span>
            <span className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-primary"><s.icon className="size-6" aria-hidden /></span>
            <h3 className="font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAQ = [
  ["Is it free?", "Yes. FoodBridge is run by the government and has no fees for givers or receivers."],
  ["How do you keep food safe?", "Cooked food is marked safe for 4 hours from cooking, raw ingredients for 24. We only alert receivers who can arrive in time, with a safety buffer."],
  ["Who sees my address?", "Nobody until both sides accept. Before that, only your area is shown."],
  ["Who delivers?", "Only the two parties themselves. The giver chooses to deliver, or the receiver to pick up."],
  ["What if someone does not show up?", "A reservation lasts 15 minutes. After that the food is open to others. You can also file a complaint, and repeated complaints suspend an account for review."],
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-32 py-14">
      <h2 className="mb-6 font-display text-2xl font-semibold sm:text-4xl">{t.landing.faq}</h2>
      <div className="divide-y rounded-[20px] border bg-background">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
              {q}<Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  const { data: me } = useMe();
  return (
    <section className="mx-auto max-w-[1680px] px-4 sm:px-8 py-10">
      <div className="relative overflow-hidden rounded-[28px] p-8 sm:p-14" style={{ background: "linear-gradient(135deg,#d8eefa,#eaf7fb)" }}>
        <h2 className="max-w-lg text-balance font-display text-3xl font-semibold leading-tight text-[#032724] sm:text-5xl">Ready to Share Surplus Food?</h2>
        <p className="mb-6 mt-3 max-w-md text-sm text-[#44575a]">Join restaurants, caterers, homes, charities and institutions already keeping good food out of the bin.</p>
        <div className="flex flex-wrap gap-3">
          <ArrowPill href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"}>I have food</ArrowPill>
          <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }), "h-10 border-[#032724]/30 bg-transparent px-5 text-[#032724] hover:bg-white/60")}>I need food</Link>
        </div>
        <Soup className="absolute -bottom-12 right-4 hidden size-72 text-primary/20 sm:block" strokeWidth={1} aria-hidden />
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 bg-[#032724] text-white">
      <div className="mx-auto flex max-w-[1680px] px-4 sm:px-8 flex-col items-start justify-between gap-6 pb-6 pt-12 sm:flex-row sm:items-center">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm text-white/70">A government food-surplus network. Good food finds a plate.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/api/docs" className={cn(buttonVariants({ variant: "ghost" }), "h-10 text-white hover:bg-white/10 hover:text-white")}>API docs</Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 text-white hover:bg-white/10 hover:text-white")}>Log in</Link>
          <Link href="/signup" className={cn(buttonVariants(), "h-10 bg-white text-[#032724] hover:bg-white/90")}>Join</Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-2 border-t border-white/10 px-4 py-5 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2"><Landmark className="size-4 text-saffron" aria-hidden /> Run by the District Food Authority as a public food-security programme.</p>
        <p>Prototype built for a hackathon. Not an official government website or service.</p>
      </div>
      <p className="pointer-events-none select-none overflow-hidden text-center font-display text-[clamp(4rem,19vw,16rem)] font-extrabold leading-[0.85] tracking-tighter text-white/12" aria-hidden>FoodBridge</p>
    </footer>
  );
}

