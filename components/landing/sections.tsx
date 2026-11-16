import { BadgeCheck, Handshake, HeartHandshake, Plus, Radar, ShieldCheck, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { TierBadge } from "@/components/shared/badges";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import { ImpactCounters } from "./counters";

export function HowItWorks() {
  const steps = [
    { icon: HeartHandshake, title: "Share surplus", body: "Givers post what is left, with the cooking time. We compute exactly how long it stays safe." },
    { icon: Radar, title: "We find the nearest safe match", body: "Only receivers who can arrive before the food spoils are alerted, ranked by distance, time, quantity and trust." },
    { icon: Handshake, title: "Hand over with a code", body: "Both sides agree, the giver shows a 6-digit code, the receiver enters it at pickup. Points and recognition follow." },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
      <h2 className="font-display text-3xl font-semibold">{t.landing.how}</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-[20px] border bg-surface p-6 shadow-soft">
            <span className="absolute right-5 top-4 font-display text-5xl font-semibold text-primary/10">{i + 1}</span>
            <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <s.icon className="size-6" aria-hidden />
            </span>
            <h3 className="font-display text-lg font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrustStrip() {
  return (
    <section id="trust" className="scroll-mt-20 bg-deep py-14 text-white" style={{ background: "linear-gradient(135deg,#0F3D2A,#1A5C3C)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="size-4 text-saffron" aria-hidden /> Government verified platform
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold">{t.landing.trust}</h2>
          <p className="mt-3 text-white/80">Every handover earns points. Reliable givers climb tiers, get a shareable certificate, and are shown first. Complaints are weighted by the complainant&apos;s own trust, and the government team reviews every suspension and appeal.</p>
          <div className="mt-6 flex flex-wrap gap-2 [&_span]:bg-white/90">
            <TierBadge tier="BRONZE" />
            <TierBadge tier="SILVER" />
            <TierBadge tier="GOLD" />
            <TierBadge tier="PLATINUM" />
          </div>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            {[[BadgeCheck, "Exact address shown only after both sides accept"], [Timer, "Reservations auto-release in 15 minutes"], [Trophy, "Certificates with a QR anyone can verify"]].map(([Icon, text]) => {
              const I = Icon as typeof BadgeCheck;
              return (
                <li key={text as string} className="flex items-center gap-2">
                  <I className="size-4 shrink-0 text-saffron" aria-hidden /> {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rotate-1 rounded-3xl bg-[#FBF7F0] p-6 text-[#16251D] shadow-lift" aria-label="Sample certificate">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="text-xs text-[#5E6B63]">Government verified</span>
          </div>
          <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-clay">CERTIFICATE OF KINDNESS</p>
          <p className="mt-1 font-display text-3xl font-semibold text-deep">Malabar Feast Caterers</p>
          <p className="mt-1">
            saved <b className="text-primary">120 meals</b> from the bin.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-saffron px-3 py-1 text-sm font-bold">+175 points</span>
            <span className="rounded-full bg-[#E0A21B] px-3 py-1 text-sm font-bold text-white">Gold</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ImpactSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <h2 className="mb-6 font-display text-3xl font-semibold">{t.landing.impact}</h2>
      <ImpactCounters />
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
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14">
      <h2 className="mb-6 font-display text-3xl font-semibold">{t.landing.faq}</h2>
      <div className="divide-y rounded-2xl border bg-surface">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted-foreground">A government food-surplus network. Good food finds a plate.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/api/docs" className={cn(buttonVariants({ variant: "ghost" }), "h-10 rounded-xl")}>API docs</Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 rounded-xl")}>Log in</Link>
          <Link href="/signup" className={cn(buttonVariants(), "h-10 rounded-xl")}>Join</Link>
        </div>
      </div>
    </footer>
  );
}
