"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { MapPicker } from "@/components/map/map-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { KIND_LABEL } from "@/lib/format";
import { OnboardSchema } from "@/lib/schemas/profile";
import { cn } from "@/lib/utils";

const GIVER_KINDS = ["RESTAURANT", "CATERER", "HOUSEHOLD", "EVENT"];
const TAKER_KINDS = ["INSTITUTION", "CHARITY", "HOUSE"];
const STEPS = ["Profile", "Location", "Details"];

type Errs = Record<string, string>;

export function OnboardingWizard({ role, defaultName }: { role: "GIVER" | "TAKER"; defaultName: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const kinds = role === "GIVER" ? GIVER_KINDS : TAKER_KINDS;
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [f, setF] = useState({ name: defaultName.includes("@") ? "" : defaultName, kind: kinds[0], mapsUrl: "", address: "", area: "", members: "" });
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function validate(upTo: number): boolean {
    const candidate = {
      name: f.name,
      kind: f.kind,
      mapsUrl: f.mapsUrl || undefined,
      address: f.address,
      area: f.area,
      lat: pt?.lat ?? Number.NaN,
      lng: pt?.lng ?? Number.NaN,
      members: f.members ? Number(f.members) : undefined,
    };
    const r = OnboardSchema.safeParse(candidate);
    const e: Errs = {};
    if (!r.success) {
      for (const i of r.error.issues) {
        const k = String(i.path[0]);
        const stepOf = ["name", "kind", "mapsUrl"].includes(k) ? 0 : ["lat", "lng", "address", "area"].includes(k) ? 1 : 2;
        if (stepOf <= upTo && !e[k]) e[k] = k === "lat" || k === "lng" ? "Pin your location on the map" : i.message;
      }
    }
    if (role === "TAKER" && upTo >= 2 && !f.members) e.members = "Enter the number of members";
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function finish() {
    if (!validate(2) || !pt) return;
    setBusy(true);
    try {
      await api("/api/v1/me/onboard", {
        method: "POST",
        body: { name: f.name.trim(), kind: f.kind, mapsUrl: f.mapsUrl || undefined, address: f.address.trim(), area: f.area.trim(), lat: pt.lat, lng: pt.lng, members: f.members ? Number(f.members) : undefined },
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("You are all set");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  const err = (k: string) =>
    errs[k] ? (
      <p role="alert" className="text-sm text-clay">
        {errs[k]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-5">
        <Logo />
        <span className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>
      <main id="main" className="mx-auto max-w-xl px-4 pb-16">
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Onboarding progress" className="mb-2" />
        <ol className="mb-6 flex justify-between text-xs font-medium text-muted-foreground">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-1", i <= step && "text-primary")}>
              {i < step ? <Check className="size-3.5" aria-hidden /> : null} {s}
            </li>
          ))}
        </ol>

        <div className="rounded-[20px] border bg-surface p-6 shadow-soft">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-5">
              {step === 0 && (
                <>
                  <div>
                    <h1 className="font-display text-2xl font-semibold">Tell us who you are</h1>
                    <p className="text-sm text-muted-foreground">This is shown to people you share food with.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{role === "GIVER" ? "Business or household name" : "Institution or family name"}</Label>
                    <Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} className="h-11 rounded-xl" autoComplete="organization" />
                    {err("name")}
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Type</legend>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup">
                      {kinds.map((k) => (
                        <button key={k} type="button" role="radio" aria-checked={f.kind === k} onClick={() => set("kind", k)} className={cn("min-h-11 rounded-xl border-2 px-3 text-sm font-medium transition-colors", f.kind === k ? "border-primary bg-primary/8 text-deep" : "border-line hover:border-primary/40")}>
                          {KIND_LABEL[k]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="space-y-1.5">
                    <Label htmlFor="maps">Google Maps or profile link (optional)</Label>
                    <Input id="maps" value={f.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} placeholder="https://maps.google.com/..." className="h-11 rounded-xl" inputMode="url" />
                    {err("mapsUrl")}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">Where are you?</h2>
                    <p className="text-sm text-muted-foreground">Used to find the nearest match. Your exact address stays private until a handover is accepted.</p>
                  </div>
                  <MapPicker value={pt} onChange={setPt} />
                  {(errs.lat || errs.lng) && (
                    <p role="alert" className="text-sm text-clay">
                      Pin your location on the map
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="area">Area / locality</Label>
                    <Input id="area" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Mavoor Road" className="h-11 rounded-xl" />
                    {err("area")}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr">Full address</Label>
                    <Textarea id="addr" value={f.address} onChange={(e) => set("address", e.target.value)} rows={2} className="rounded-xl" autoComplete="street-address" />
                    {err("address")}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{role === "TAKER" ? "How many people do you feed?" : "Almost done"}</h2>
                    <p className="text-sm text-muted-foreground">{role === "TAKER" ? "We use this to size matches. You can post specific needs later." : "Review and finish. You can start posting food right away."}</p>
                  </div>
                  {role === "TAKER" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="members">Number of members</Label>
                      <Input id="members" type="number" min={1} inputMode="numeric" value={f.members} onChange={(e) => set("members", e.target.value)} className="h-11 rounded-xl" />
                      {err("members")}
                    </div>
                  )}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-muted p-4 text-sm">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{f.name}</dd>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{KIND_LABEL[f.kind]}</dd>
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="font-medium">{f.area}</dd>
                  </dl>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex justify-between gap-3">
            <Button variant="outline" className="h-11 rounded-xl" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-1 size-4" aria-hidden /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button className="h-11 rounded-xl" onClick={() => validate(step) && setStep((s) => s + 1)}>
                Continue <ArrowRight className="ml-1 size-4" aria-hidden />
              </Button>
            ) : (
              <Button className="h-11 rounded-xl" onClick={finish} disabled={busy}>
                {busy ? "Saving..." : "Finish setup"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
