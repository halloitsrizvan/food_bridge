"use client";

import { Minus, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContactNeed, useDirectOffer, useSafeHours } from "@/lib/api/hooks";
import { DIET_LABEL, MODE_LABEL } from "@/lib/format";
import type { Diet, Mode } from "@/lib/schemas/food";
import { cn } from "@/lib/utils";

export type NeedTarget = { id: string; title: string; mealsNeeded: number; diet: Diet; mode: Mode; takerName: string };

const MODES: Mode[] = ["EITHER", "GIVER_DELIVERS", "TAKER_PICKS_UP"];

/**
 * A giver answers a receiver's request: no need to post food first. The receiver gets a notification and
 * can accept (then the normal OTP / QR handover follows) or decline.
 */
export function OfferToNeedDialog({ need, onClose, existing }: { need: NeedTarget | null; onClose: () => void; existing?: { id: string; title: string } | null }) {
  return (
    <Dialog open={!!need} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{need && <Body key={need.id} need={need} onClose={onClose} existing={existing} />}</DialogContent>
    </Dialog>
  );
}

function Body({ need, onClose, existing }: { need: NeedTarget; onClose: () => void; existing?: { id: string; title: string } | null }) {
  const router = useRouter();
  const direct = useDirectOffer();
  const contact = useContactNeed();
  const cfg = useSafeHours().data;
  const maxHours = Math.max(cfg?.safeHours.COOKED ?? 4, cfg?.safeHoursMax.COOKED ?? 12);
  const [meals, setMeals] = useState(need.mealsNeeded);
  const [hours, setHours] = useState(Math.min(cfg?.safeHours.COOKED ?? 4, maxHours));
  const [mode, setMode] = useState<Mode>(need.mode);
  const busy = direct.isPending || contact.isPending;

  function send() {
    if (meals < 1) return void toast.error("Enter how many meals you can give");
    direct.mutate(
      { needId: need.id, meals, safeHours: Math.min(hours, maxHours), mode },
      {
        onSuccess: (r) => {
          toast.success(`Offer sent to ${need.takerName}. They have 15 minutes to accept.`);
          onClose();
          router.push(`/dashboard/claims/${r.id}`);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Offer food to {need.takerName}</DialogTitle>
        <DialogDescription>
          They get a notification and 15 minutes to accept. If they do, you hand over with the usual code or QR. No need to post food first.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-2xl bg-info/10 p-3 text-sm">
        <p className="font-medium">{need.title}</p>
        <p className="text-muted-foreground">{need.mealsNeeded} meals needed · {DIET_LABEL[need.diet]}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="o-meals">Meals you can give</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Fewer meals" onClick={() => setMeals((m) => Math.max(1, m - 5))}><Minus /></Button>
          <Input id="o-meals" type="number" min={1} inputMode="numeric" value={meals} onChange={(e) => setMeals(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-28 rounded-xl text-center font-display text-xl tabular" />
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="More meals" onClick={() => setMeals((m) => m + 5)}><Plus /></Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="o-hours">How long will the food stay fresh? (hours)</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Shorter" onClick={() => setHours((h) => Math.max(0.5, Math.round((h - 0.5) * 2) / 2))}><Minus /></Button>
          <Input id="o-hours" type="number" min={0.5} max={maxHours} step={0.5} inputMode="decimal" value={hours} onChange={(e) => setHours(Math.min(maxHours, Math.max(0, Number(e.target.value) || 0)))} className="h-11 w-24 rounded-xl text-center font-display text-xl tabular" />
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Longer" onClick={() => setHours((h) => Math.min(maxHours, Math.round((h + 0.5) * 2) / 2))}><Plus /></Button>
          <span className="text-xs text-muted-foreground">up to {maxHours}h</span>
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Handover</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("min-h-11 rounded-xl border-2 px-2 text-xs font-semibold transition-colors", mode === m ? "border-primary bg-primary/8" : "border-line hover:border-primary/40")}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </fieldset>

      <Button className="h-12 w-full gap-2 text-base" disabled={busy} onClick={send}>
        <Send className="size-4" aria-hidden /> {direct.isPending ? "Sending..." : "Send offer"}
      </Button>
      {existing && (
        <Button
          variant="ghost"
          className="h-auto min-h-10 whitespace-normal py-2 text-sm"
          disabled={busy}
          onClick={() =>
            contact.mutate(
              { needId: need.id, offerId: existing.id },
              {
                onSuccess: (r) => {
                  toast.success(`Offer sent to ${need.takerName}. They have 15 minutes to accept.`);
                  onClose();
                  router.push(`/dashboard/claims/${r.id}`);
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          Or offer my open post “{existing.title}” instead
        </Button>
      )}
    </>
  );
}
