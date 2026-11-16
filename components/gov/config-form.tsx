"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGovConfig, useSaveConfig } from "@/lib/api/hooks";

type Cfg = {
  safeHours: { COOKED: number; RAW: number };
  radiusSteps: [number, number, number];
  escalateAt: [number, number];
  govAlertAt: number;
  speedKmh: number;
  bufferMin: number;
  holdMinutes: number;
  points: { base: number; mealCap: number; fastBonus: number; fastWithinMin: number; takerConfirm: number };
  suspension: { weightThreshold: number; windowDays: number };
  impact: { kgPerMeal: number; co2PerKg: number };
};

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  const id = label.replace(/\W+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} className="h-10 rounded-xl tabular" />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[20px] border bg-surface p-5 shadow-soft">
      <legend className="px-2 font-display text-lg font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Editor({ initial }: { initial: Cfg }) {
  const [c, setC] = useState<Cfg>(initial);
  const save = useSaveConfig();
  const up = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setC((s) => ({ ...s, [k]: v }));
  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(c as unknown as Record<string, unknown>, { onSuccess: () => toast.success("Configuration saved. Applies within 10 seconds."), onError: (er) => toast.error(er.message) }); }}>
      <Group title="Food safety">
        <Num label="Cooked food safe (hours)" step={0.5} value={c.safeHours.COOKED} onChange={(n) => up("safeHours", { ...c.safeHours, COOKED: n })} />
        <Num label="Raw ingredients safe (hours)" value={c.safeHours.RAW} onChange={(n) => up("safeHours", { ...c.safeHours, RAW: n })} />
        <Num label="Travel speed (km/h)" value={c.speedKmh} onChange={(n) => up("speedKmh", n)} />
        <Num label="Safety buffer (min)" value={c.bufferMin} onChange={(n) => up("bufferMin", n)} />
      </Group>
      <Group title="Matching and escalation">
        {c.radiusSteps.map((r, i) => <Num key={i} label={`Search radius step ${i + 1} (km)`} step={0.5} value={r} onChange={(n) => up("radiusSteps", c.radiusSteps.map((x, j) => (j === i ? n : x)) as Cfg["radiusSteps"])} />)}
        <Num label="Widen to step 2 at (fraction of window)" step={0.05} value={c.escalateAt[0]} onChange={(n) => up("escalateAt", [n, c.escalateAt[1]])} />
        <Num label="Widen to step 3 at (fraction)" step={0.05} value={c.escalateAt[1]} onChange={(n) => up("escalateAt", [c.escalateAt[0], n])} />
        <Num label="Alert government at (fraction)" step={0.05} value={c.govAlertAt} onChange={(n) => up("govAlertAt", n)} />
        <Num label="Reservation hold (minutes)" value={c.holdMinutes} onChange={(n) => up("holdMinutes", n)} />
      </Group>
      <Group title="Points">
        <Num label="Base points per handover" value={c.points.base} onChange={(n) => up("points", { ...c.points, base: n })} />
        <Num label="Meal points cap" value={c.points.mealCap} onChange={(n) => up("points", { ...c.points, mealCap: n })} />
        <Num label="Fast handover bonus" value={c.points.fastBonus} onChange={(n) => up("points", { ...c.points, fastBonus: n })} />
        <Num label="Fast within (min)" value={c.points.fastWithinMin} onChange={(n) => up("points", { ...c.points, fastWithinMin: n })} />
        <Num label="Receiver confirmation points" value={c.points.takerConfirm} onChange={(n) => up("points", { ...c.points, takerConfirm: n })} />
      </Group>
      <Group title="Suspension and impact">
        <Num label="Suspend at weighted complaints" step={0.5} value={c.suspension.weightThreshold} onChange={(n) => up("suspension", { ...c.suspension, weightThreshold: n })} />
        <Num label="Complaint window (days)" value={c.suspension.windowDays} onChange={(n) => up("suspension", { ...c.suspension, windowDays: n })} />
        <Num label="Kg per meal" step={0.05} value={c.impact.kgPerMeal} onChange={(n) => up("impact", { ...c.impact, kgPerMeal: n })} />
        <Num label="CO₂ kg per kg of food" step={0.1} value={c.impact.co2PerKg} onChange={(n) => up("impact", { ...c.impact, co2PerKg: n })} />
      </Group>
      <Button type="submit" disabled={save.isPending} className="h-11 rounded-xl px-8">{save.isPending ? "Saving..." : "Save configuration"}</Button>
    </form>
  );
}

export function GovConfig() {
  const { data, isPending, isError, error, refetch } = useGovConfig();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Configuration</h1>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : <Editor initial={data as unknown as Cfg} />}
    </div>
  );
}
