"use client";

import { ArrowUpRight, Landmark, ChevronLeft, ChevronRight, Carrot, Drumstick, Handshake, HeartHandshake, Leaf, Package, Plus, Radar, Salad, Soup, Timer, } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Logo } from "@/components/layout/logo";
import { Avatar, kindLabel } from "@/components/shared/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLeaderboard, useMe, useOffers } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import { useT } from "@/lib/i18n";
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
  { key: "cooked" as const, icon: Salad, bg: "bg-[#fdeee6]", fg: "text-[#c2562b]", f: { category: "COOKED" } },
  { key: "veg" as const, icon: Leaf, bg: "bg-[#e8f5ec]", fg: "text-[#1d7a45]", f: { diet: "VEG" } },
  { key: "nonveg" as const, icon: Drumstick, bg: "bg-[#fdebe9]", fg: "text-[#c0392b]", f: { diet: "NON_VEG" } },
  { key: "packaged" as const, icon: Package, bg: "bg-[#eaf2fc]", fg: "text-[#2f6fb5]", f: { category: "PACKAGED" } },
  { key: "raw" as const, icon: Carrot, bg: "bg-[#fff3dc]", fg: "text-[#b7791f]", f: { category: "RAW" } },
];

export function ExploreCategories() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * 280, behavior: "smooth" });
  return (
    <section className="mx-auto max-w-[1680px] px-4 sm:px-8 py-14">
      <SectionHead
        title={t.cats.title}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="size-10" aria-label={t.cats.left} onClick={() => scroll(-1)}><ChevronLeft /></Button>
            <Button size="icon" className="size-10" aria-label={t.cats.right} onClick={() => scroll(1)}><ChevronRight /></Button>
          </div>
        }
      />
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <button key={c.key} type="button" onClick={() => setFeedFilter(c.f)} className={cn("group flex min-h-[13rem] w-56 shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-[20px] p-5 text-center transition-transform hover:-translate-y-1", c.bg)}>
            <span className={cn("grid size-24 place-items-center rounded-full bg-white/70 transition-transform group-hover:scale-105", c.fg)}>
              <c.icon className="size-12" strokeWidth={1.6} aria-hidden />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold text-[#212529]">{t.cats[c.key].label}</span>
              <span className="text-sm text-[#667085]">{t.cats[c.key].sub}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PromoBanners() {
  const t = useT();
  const { data: me } = useMe();
  return (
    <section className="mx-auto grid max-w-[1680px] px-4 sm:px-8 gap-4 py-6 lg:grid-cols-[1fr_1.7fr]">
      <div className="grid gap-4">
        <div className="relative overflow-hidden rounded-[20px] p-6 text-white" style={{ background: "linear-gradient(135deg,#6c5ce7,#8e7cf3)" }}>
          <h3 className="font-display text-2xl font-semibold">{t.promo.shareTitle}</h3>
          <p className="mb-5 mt-1 max-w-[14rem] text-sm text-white/80">{t.promo.shareBody}</p>
          <ArrowPill href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"}>{t.promo.shareCta}</ArrowPill>
          <Soup className="absolute -bottom-4 -right-3 size-32 rotate-12 text-white/25" aria-hidden />
        </div>
        <div className="relative overflow-hidden rounded-[20px] p-6 text-white" style={{ background: "linear-gradient(135deg,#e8913a,#f4b66a)" }}>
          <h3 className="font-display text-2xl font-semibold">{t.promo.feedTitle}</h3>
          <p className="mb-5 mt-1 max-w-[14rem] text-sm text-white/90">{t.promo.feedBody}</p>
          <ArrowPill href="/signup" tone="light">{t.promo.feedCta}</ArrowPill>
          <HeartHandshake className="absolute -bottom-4 -right-3 size-32 -rotate-12 text-white/30" aria-hidden />
        </div>
      </div>
      <div className="relative min-h-[22rem] overflow-hidden rounded-[20px] p-8 text-white sm:p-10" style={{ background: "linear-gradient(120deg,#0a8fc4 0%,#27b3d9 60%,#7fd6ea 100%)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/85">
          {t.promo.badgeFree} <span className="text-saffron">{t.promo.badgeGov}</span>
        </p>
        <h3 className="mt-3 max-w-md text-balance font-display text-4xl font-semibold leading-[1.05] sm:text-5xl">{t.promo.bigTitle}</h3>
        <p className="mb-6 mt-4 max-w-sm text-sm text-white/90">{t.promo.bigBody}</p>
        <ArrowPill href="#live" tone="light">{t.promo.bigCta}</ArrowPill>
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
  const t = useT();
  const now = useNow();
  const { data } = useOffers({ sort: "soonest", maxMinutesLeft: 480, limit: 2 });
  if (!data?.items.length) return null;
  return (
    <section id="deals" className="mx-auto max-w-[1680px] px-4 sm:px-8 scroll-mt-32 py-14">
      <SectionHead title={t.deals.title} action={<span className="rounded-full bg-clay/10 px-4 py-2 text-sm font-semibold text-clay"><Timer className="mr-1 inline size-4" aria-hidden />{t.deals.badge}</span>} />
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
                  <CountBox n={pad(d)} label={t.deals.day} /><CountBox n={pad(h)} label={t.deals.hour} /><CountBox n={pad(m)} label={t.deals.min} /><CountBox n={pad(s)} label={t.deals.sec} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{t.deals.running}</span><span>{t.deals.mealsLabel} <b className="text-clay">{o.quantityMeals}</b></span></div>
                  <div className="flex h-2 gap-[3px]" aria-hidden>
                    {Array.from({ length: 20 }, (_, i) => <span key={i} className={cn("flex-1 rounded-sm", i < Math.round(pct * 20) ? "bg-primary" : "bg-primary/15")} />)}
                  </div>
                </div>
                <Link href={`/dashboard/offers/${o.id}`} className={cn(buttonVariants(), "h-10 w-full")}>{t.deals.request}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const t = useT();
  const icons = [HeartHandshake, Radar, Handshake];
  const steps = t.how.steps.map((st, i) => ({ ...st, icon: icons[i] }));
  return (
    <section id="how" className="mx-auto max-w-[1680px] px-4 sm:px-8 scroll-mt-32 py-14">
      <SectionHead title={t.how.title} />
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

export function TopGivers() {
  const t = useT();
  const { data: me } = useMe();
  const { data, isPending } = useLeaderboard();
  const rows = (data ?? []).filter((g) => g.points > 0).slice(0, 5);
  if (!isPending && rows.length === 0) return null;
  return (
    <section id="top-givers" className="mx-auto grid max-w-[1680px] scroll-mt-32 gap-8 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_1.7fr] lg:gap-14">
      <div className="lg:pt-2">
        <h2 className="font-display text-2xl font-semibold sm:text-4xl">{t.top.title}</h2>
        <p className="mt-3 max-w-sm text-muted-foreground">{t.top.sub}</p>
        <Link href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"} className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-11 px-6")}>
          {t.top.cta}
        </Link>
      </div>
      <ol className="divide-y overflow-hidden rounded-[20px] border bg-background" aria-label={t.top.title}>
        {isPending
          ? Array.from({ length: 5 }, (_, i) => <li key={i} className="h-[4.5rem] animate-pulse bg-secondary/50" />)
          : rows.map((g, i) => (
              <li key={g.rank} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <span className={cn("w-6 shrink-0 text-center font-display text-lg font-semibold tabular", i === 0 ? "text-[#b7791f]" : "text-muted-foreground")}>{g.rank}</span>
                <Avatar name={g.name} kind={g.kind} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[kindLabel(g.kind), g.area].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-semibold tabular text-primary">{g.points.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{g.meals > 0 ? `${g.meals} ${t.common.meals}` : t.top.points}</p>
                </div>
              </li>
            ))}
      </ol>
    </section>
  );
}

/** Flat illustration for the FAQ: a bowl of food, steam and a question bubble, in the site's teal and saffron. */
function FaqArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden>
      <circle cx="200" cy="205" r="170" className="fill-primary/10" />
      <circle cx="200" cy="205" r="170" className="stroke-primary/30" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
      {/* steam */}
      <path d="M160 150c-14-18 14-30 0-52M200 140c-14-18 14-30 0-52M240 150c-14-18 14-30 0-52" className="stroke-primary/60" strokeWidth="6" strokeLinecap="round" />
      {/* food mound */}
      <path d="M96 232c6-52 50-84 104-84s98 32 104 84z" className="fill-saffron" />
      <path d="M96 232c6-52 50-84 104-84s98 32 104 84" className="stroke-[#b7791f]" strokeWidth="4" strokeLinecap="round" />
      <circle cx="160" cy="196" r="6" className="fill-white/70" />
      <circle cx="205" cy="180" r="6" className="fill-white/70" />
      <circle cx="240" cy="206" r="6" className="fill-white/70" />
      <circle cx="132" cy="218" r="5" className="fill-white/70" />
      <circle cx="270" cy="224" r="5" className="fill-white/70" />
      {/* bowl */}
      <path d="M78 232h244c0 62-52 104-122 104S78 294 78 232z" className="fill-primary" />
      <path d="M78 232h244" className="stroke-deep" strokeWidth="5" strokeLinecap="round" />
      <path d="M120 258c10 28 38 46 80 46" className="stroke-white/35" strokeWidth="6" strokeLinecap="round" />
      <rect x="150" y="332" width="100" height="14" rx="7" className="fill-deep" />
      {/* leaves */}
      <path d="M318 300c26-4 40-22 40-44-26 2-42 18-40 44z" className="fill-primary/70" />
      <path d="M318 300c8-14 18-26 34-38" className="stroke-background" strokeWidth="3" strokeLinecap="round" />
      <path d="M72 304c-24-4-38-20-36-42 24 2 40 16 36 42z" className="fill-primary/50" />
      {/* question bubble */}
      <path d="M262 52h86a16 16 0 0 1 16 16v54a16 16 0 0 1-16 16h-40l-22 22v-22h-24a16 16 0 0 1-16-16V68a16 16 0 0 1 16-16z" className="fill-background stroke-primary" strokeWidth="4" strokeLinejoin="round" />
      <path d="M290 84c0-12 10-18 20-18s20 6 20 18c0 14-20 14-20 28" className="stroke-primary" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="310" cy="128" r="4.5" className="fill-primary" />
    </svg>
  );
}

export function Faq() {
  const t = useT();
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-32 px-2 py-14 sm:px-3">
      <h2 className="mb-6 font-display text-2xl font-semibold sm:text-4xl">{t.faq.title}</h2>
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        <FaqArt className="mx-auto w-48 sm:w-60 md:w-full md:max-w-sm" />
        <div className="divide-y rounded-[20px] border bg-background">
          {t.faq.items.map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                {q}<Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  const t = useT();
  const { data: me } = useMe();
  return (
    <section className="mx-auto max-w-[1680px] px-4 sm:px-8 py-10">
      <div className="relative overflow-hidden rounded-[28px] p-8 sm:p-14" style={{ background: "linear-gradient(135deg,#d8eefa,#eaf7fb)" }}>
        <h2 className="max-w-lg text-balance font-display text-3xl font-semibold leading-tight text-[#032724] sm:text-5xl">{t.cta.title}</h2>
        <p className="mb-6 mt-3 max-w-md text-sm text-[#44575a]">{t.cta.body}</p>
        <div className="flex flex-wrap gap-3">
          <ArrowPill href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"}>{t.cta.iHaveFood}</ArrowPill>
          <Link href="/signup" className={cn(buttonVariants({ variant: "outline" }), "h-10 border-[#032724]/30 bg-transparent px-5 text-[#032724] hover:bg-white/60")}>{t.cta.iNeedFood}</Link>
        </div>
        <Soup className="absolute -bottom-12 right-4 hidden size-72 text-primary/20 sm:block" strokeWidth={1} aria-hidden />
      </div>
    </section>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="mt-10 bg-[#032724] text-white">
      <div className="mx-auto flex max-w-[1680px] px-4 sm:px-8 flex-col items-start justify-between gap-6 pb-6 pt-12 sm:flex-row sm:items-center">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm text-white/70">{t.footer.about}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/api/docs" className={cn(buttonVariants({ variant: "ghost" }), "h-10 text-white hover:bg-white/10 hover:text-white")}>{t.footer.apiDocs}</Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 text-white hover:bg-white/10 hover:text-white")}>{t.common.login}</Link>
          <Link href="/signup" className={cn(buttonVariants(), "h-10 bg-white text-[#032724] hover:bg-white/90")}>{t.common.signup}</Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-2 border-t border-white/10 px-4 py-5 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2"><Landmark className="size-4 text-saffron" aria-hidden /> {t.footer.run}</p>
        <p>{t.footer.prototype}</p>
      </div>
      <p className="pointer-events-none select-none overflow-hidden text-center font-display text-[clamp(4rem,19vw,16rem)] font-extrabold leading-[0.85] tracking-tighter text-white/12" aria-hidden>FoodBridge</p>
    </footer>
  );
}

