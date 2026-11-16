"use client";

import { Cloud, Gavel, MessageSquareWarning, Radio, Scale, Soup, Timer, UserX } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { useGovOverview } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

function Kpi({ icon: Icon, label, value, decimals = 0, suffix, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | null; decimals?: number; suffix?: string; tone?: "warn" }) {
  return (
    <div className={cn("rounded-[20px] border bg-surface p-4 shadow-soft", tone === "warn" && value ? "border-clay/40" : "")}>
      <Icon className={cn("mb-2 size-5", tone === "warn" && value ? "text-clay" : "text-primary")} />
      <p className="font-display text-3xl font-semibold tabular">{value == null ? "-" : <CountUp value={value} decimals={decimals} />}{value != null && suffix}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function LineChart({ data }: { data: { date: string; meals: number }[] }) {
  const w = 640, h = 220, pad = 28;
  const max = Math.max(10, ...data.map((d) => d.meals));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.meals)}`).join(" ");
  const area = `${x(0)},${h - pad} ${pts} ${x(data.length - 1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Meals delivered per day, last ${data.length} days. Peak ${max}.`}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad} x2={w - pad} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" strokeDasharray="4 4" />
          <text x={pad - 6} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{Math.round(max * t)}</text>
        </g>
      ))}
      <polygon points={area} fill="var(--primary)" opacity="0.12" />
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.meals)} r="3.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2"><title>{`${d.date}: ${d.meals} meals`}</title></circle>
          {i % 2 === 0 && <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{d.date.slice(5)}</text>}
        </g>
      ))}
    </svg>
  );
}

export function GovOverview() {
  const { data, isPending, isError, error, refetch } = useGovOverview();
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const k = data.kpis;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Overview</h1>
        <p className="text-muted-foreground">Live platform health. Refreshes every 15 seconds.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Soup} label="Meals delivered" value={k.meals} />
        <Kpi icon={Scale} label="Kg of food saved" value={k.kg} />
        <Kpi icon={Cloud} label="Kg CO₂ avoided" value={k.co2Kg} />
        <Kpi icon={Radio} label="Active posts" value={k.activePosts} />
        <Kpi icon={Timer} label="Avg minutes to match" value={k.avgMatchMinutes} />
        <Kpi icon={MessageSquareWarning} label="Complaints (30 days)" value={k.openComplaints} tone="warn" />
        <Kpi icon={Gavel} label="Open appeals" value={k.openAppeals} tone="warn" />
        <Kpi icon={UserX} label="Suspended accounts" value={k.suspended} tone="warn" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-semibold">Meals delivered per day</h2>
          <LineChart data={data.mealsPerDay} />
        </section>
        <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-semibold">Top givers</h2>
          {data.leaderboard.length === 0 ? <p className="text-sm text-muted-foreground">No handovers yet.</p> : (
            <ol className="space-y-2.5">
              {data.leaderboard.slice(0, 6).map((g) => (
                <li key={g.rank} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-secondary font-display text-sm font-semibold">{g.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.meals} meals · {g.points} pts</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <p className="text-sm text-muted-foreground">{k.givers} givers · {k.takers} receivers onboarded · {k.handovers} completed handovers.</p>
    </div>
  );
}
