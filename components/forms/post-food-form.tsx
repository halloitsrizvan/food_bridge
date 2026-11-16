"use client";

import { CalendarClock, Minus, Package, Plus, ShieldCheck, Truck, Footprints, ArrowLeftRight, Salad, Carrot, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOffer } from "@/lib/api/hooks";
import { formatLeft, toLocalInput } from "@/lib/format";
import { CreateOfferSchema, type Category, type Diet, type Mode } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DEFAULT_CONFIG } from "@/server/logic/config";
import { safeUntil } from "@/server/logic/time";

function Radios<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { v: T; title: string; sub?: string; icon: React.ComponentType<{ className?: string }> }[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className={cn("grid gap-2", options.length === 3 ? "sm:grid-cols-3" : "grid-cols-2")} role="radiogroup">
        {options.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cn("flex min-h-[64px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors", value === o.v ? "border-primary bg-primary/8" : "border-line hover:border-primary/40")}>
            <o.icon className={cn("size-5 shrink-0", value === o.v ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block text-sm font-semibold">{o.title}</span>
              {o.sub && <span className="block text-xs text-muted-foreground">{o.sub}</span>}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function PostFoodForm({ photosEnabled }: { photosEnabled: boolean }) {
  const router = useRouter();
  const create = useCreateOffer();
  const now = useNow();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("COOKED");
  const [diet, setDiet] = useState<Diet>("VEG");
  const [qty, setQty] = useState(20);
  const [cooked, setCooked] = useState(() => toLocalInput(new Date(Date.now() - 30 * 60_000)));
  const [expiry, setExpiry] = useState(() => toLocalInput(new Date(Date.now() + 6 * 3_600_000)));
  const [mode, setMode] = useState<Mode>("EITHER");
  const [later, setLater] = useState(false);
  const [sched, setSched] = useState(() => toLocalInput(new Date(Date.now() + 3 * 3_600_000)));
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [errs, setErrs] = useState<Record<string, string>>({});

  // Live "safe until" preview using the same pure function the server uses (default window sizes).
  const preview = useMemo(() => {
    const exp = new Date(expiry);
    if (Number.isNaN(exp.getTime())) return null;
    const ck = category === "PACKAGED" ? null : new Date(cooked);
    if (ck && Number.isNaN(ck.getTime())) return null;
    const safe = safeUntil(category, ck, exp, DEFAULT_CONFIG, new Date());
    const eff = new Date(Math.min(safe.getTime(), exp.getTime()));
    return { safe, eff, limitedBy: exp.getTime() < safe.getTime() ? "printed expiry" : category === "COOKED" ? "4 hours after cooking" : category === "RAW" ? "24 hours after prep" : "printed expiry" };
  }, [category, cooked, expiry]);
  const left = preview && now ? preview.eff.getTime() - now : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = CreateOfferSchema.safeParse({
      title,
      description,
      category,
      diet,
      quantityMeals: qty,
      cookedAt: category === "PACKAGED" ? undefined : cooked ? new Date(cooked) : undefined,
      expectedExpiryAt: new Date(expiry),
      mode,
      photoUrl,
      scheduledFor: later ? new Date(sched) : undefined,
    });
    if (!r.success) {
      const m: Record<string, string> = {};
      for (const i of r.error.issues) m[String(i.path[0])] ??= i.message;
      setErrs(m);
      return toast.error("Please fix the highlighted fields");
    }
    setErrs({});
    create.mutate(r.data, {
      onSuccess: (o) => {
        toast.success(later ? "Scheduled. Nearby receivers are notified when it opens." : "Posted. Nearby receivers are being alerted.");
        router.push(`/dashboard/offers/${o.id}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const err = (k: string) => errs[k] && <p role="alert" className="text-sm text-clay">{errs[k]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="space-y-6 rounded-[20px] border bg-surface p-6 shadow-soft">
        <div className="space-y-1.5">
          <Label htmlFor="title">What is it?</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Veg biryani trays" maxLength={80} className="h-11 rounded-xl" aria-invalid={!!errs.title} />
          {err("title")}
        </div>
        <Radios label="Type of food" value={category} onChange={setCategory} options={[
          { v: "COOKED", title: "Cooked", sub: "Safe 4h", icon: Salad },
          { v: "PACKAGED", title: "Packaged", sub: "Printed expiry", icon: Package },
          { v: "RAW", title: "Raw", sub: "Safe 24h", icon: Carrot },
        ]} />
        <Radios label="Diet" value={diet} onChange={setDiet} options={[
          { v: "VEG", title: "Veg", icon: Salad },
          { v: "NON_VEG", title: "Non-veg", icon: Package },
          { v: "BOTH", title: "Both", icon: ArrowLeftRight },
        ]} />

        <div className="space-y-1.5">
          <Label htmlFor="qty">Quantity (meals)</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Fewer meals" onClick={() => setQty((q) => Math.max(1, q - 5))}><Minus /></Button>
            <Input id="qty" type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-28 rounded-xl text-center font-display text-xl tabular" />
            <Button type="button" variant="outline" size="icon" className="size-11 rounded-xl" aria-label="More meals" onClick={() => setQty((q) => q + 5)}><Plus /></Button>
          </div>
          {err("quantityMeals")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {category !== "PACKAGED" && (
            <div className="space-y-1.5">
              <Label htmlFor="cooked">{category === "RAW" ? "Prepared / bought at" : "Cooked at"}</Label>
              <Input id="cooked" type="datetime-local" value={cooked} onChange={(e) => setCooked(e.target.value)} className="h-11 rounded-xl" />
              {err("cookedAt")}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="expiry">{category === "PACKAGED" ? "Expiry printed on pack" : "Best before (your estimate)"}</Label>
            <Input id="expiry" type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-11 rounded-xl" />
            {err("expectedExpiryAt")}
          </div>
        </div>

        <Radios label="Handover" value={mode} onChange={setMode} options={[
          { v: "EITHER", title: "Either", sub: "Flexible", icon: ArrowLeftRight },
          { v: "TAKER_PICKS_UP", title: "They pick up", icon: Footprints },
          { v: "GIVER_DELIVERS", title: "I deliver", icon: Truck },
        ]} />

        <div className="space-y-1.5">
          <Label htmlFor="desc">Notes (optional)</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className="rounded-xl" placeholder="Allergens, packaging, how to find you..." />
        </div>

        {photosEnabled && (
          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            <ImageUpload folder="uploads" onUploaded={setPhotoUrl} />
          </div>
        )}

        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="size-4 text-info" aria-hidden /> Announce later (event pre-announce)</p>
              <p className="text-xs text-muted-foreground">Shown as “Upcoming”; receivers are alerted when it opens.</p>
            </div>
            <Switch checked={later} onCheckedChange={setLater} aria-label="Announce later" />
          </div>
          {later && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="sched">Opens at</Label>
              <Input id="sched" type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)} className="h-11 rounded-xl" />
              {err("scheduledFor")}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-[20px] border bg-surface p-5 shadow-soft" aria-live="polite">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><ShieldCheck className="size-4" aria-hidden /> Safe until</p>
          {preview ? (
            <>
              <p className="mt-2 font-display text-3xl font-semibold tabular text-deep">{preview.eff.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-sm text-muted-foreground">{preview.eff.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
              {left != null && left > 0 && <p className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-deep dark:text-primary-deep">{formatLeft(left)} left to find a match</p>}
              {left != null && left <= 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-clay/10 px-3 py-2 text-sm text-clay"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Already past its safe time. It cannot be posted.</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Limited by the {preview.limitedBy}. The earlier of your best-before and the safe window is used.</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Fill in the times to see how long it stays safe.</p>
          )}
        </div>
        <Button type="submit" disabled={create.isPending || (left != null && left <= 0)} className="h-12 w-full rounded-xl text-base">
          {create.isPending ? "Posting..." : later ? "Schedule post" : "Post surplus food"}
        </Button>
      </aside>
    </form>
  );
}
