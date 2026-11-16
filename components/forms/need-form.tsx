"use client";

import { ArrowLeftRight, Footprints, Leaf, Drumstick, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNeed } from "@/lib/api/hooks";
import { toLocalInput } from "@/lib/format";
import { CreateNeedSchema, type Diet, type Mode } from "@/lib/schemas/food";
import { cn } from "@/lib/utils";

function Pick<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { v: T; title: string; icon: React.ComponentType<{ className?: string }> }[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
        {options.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cn("flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 text-sm font-semibold transition-colors", value === o.v ? "border-primary bg-primary/8" : "border-line hover:border-primary/40")}>
            <o.icon className={cn("size-4", value === o.v ? "text-primary" : "text-muted-foreground")} /> {o.title}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function NeedForm() {
  const router = useRouter();
  const create = useCreateNeed();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [diet, setDiet] = useState<Diet>("BOTH");
  const [meals, setMeals] = useState(30);
  const [from, setFrom] = useState(() => toLocalInput(new Date()));
  const [by, setBy] = useState(() => toLocalInput(new Date(Date.now() + 5 * 3_600_000)));
  const [mode, setMode] = useState<Mode>("EITHER");
  const [errs, setErrs] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = CreateNeedSchema.safeParse({ title, notes, diet, mealsNeeded: meals, neededFrom: new Date(from), neededBy: new Date(by), mode });
    if (!r.success) {
      const m: Record<string, string> = {};
      for (const i of r.error.issues) m[String(i.path[0])] ??= i.message;
      setErrs(m);
      return toast.error("Please fix the highlighted fields");
    }
    setErrs({});
    create.mutate(r.data, {
      onSuccess: () => {
        toast.success("Need posted. Givers nearby can now offer food.");
        router.push("/dashboard");
      },
      onError: (e2) => toast.error(e2.message),
    });
  }
  const err = (k: string) => errs[k] && <p role="alert" className="text-sm text-clay">{errs[k]}</p>;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-[20px] border bg-surface p-4 shadow-soft sm:p-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="ntitle">What do you need?</Label>
        <Input id="ntitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dinner for 40 residents" maxLength={80} className="h-11 rounded-xl" aria-invalid={!!errs.title} />
        {err("title")}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meals">Meals needed</Label>
        <Input id="meals" type="number" min={1} inputMode="numeric" value={meals} onChange={(e) => setMeals(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-32 rounded-xl text-center font-display text-xl tabular" />
        {err("mealsNeeded")}
      </div>
      <Pick label="Diet" value={diet} onChange={setDiet} options={[{ v: "VEG", title: "Veg only", icon: Leaf }, { v: "NON_VEG", title: "Non-veg", icon: Drumstick }, { v: "BOTH", title: "Either", icon: ArrowLeftRight }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="from">Needed from</Label>
          <Input id="from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="by">Needed by</Label>
          <Input id="by" type="datetime-local" value={by} onChange={(e) => setBy(e.target.value)} className="h-11 rounded-xl" />
          {err("neededBy")}
        </div>
      </div>
      <Pick label="Handover" value={mode} onChange={setMode} options={[{ v: "EITHER", title: "Either", icon: ArrowLeftRight }, { v: "TAKER_PICKS_UP", title: "We pick up", icon: Footprints }, { v: "GIVER_DELIVERS", title: "Deliver to us", icon: Truck }]} />
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className="rounded-xl" />
      </div>
      <Button type="submit" disabled={create.isPending} className="h-12 w-full rounded-xl text-base sm:w-auto sm:px-10">
        {create.isPending ? "Posting..." : "Post need"}
      </Button>
    </form>
  );
}
