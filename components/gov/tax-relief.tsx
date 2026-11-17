"use client";

import { BadgePercent, Check, ChevronLeft, ChevronRight, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, kindLabel } from "@/components/shared/badges";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useGovUsers, useGrantTax, useTaxReductions, type GovUser } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";
import { GrantTaxReductionSchema, TAX_TYPES } from "@/lib/schemas/tax";
import { cn } from "@/lib/utils";

const QUICK = [10, 25, 50, 75, 100];
const todayPlus = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function TaxRelief() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const givers = useGovUsers({ q: q || undefined, role: "GIVER", page });
  const history = useTaxReductions();
  const grant = useGrantTax();

  const [giver, setGiver] = useState<GovUser | null>(null);
  const [taxType, setTaxType] = useState<(typeof TAX_TYPES)[number]>("Income tax");
  const [percent, setPercent] = useState("");
  const [validUntil, setValidUntil] = useState(todayPlus(365));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);

  const parsed = GrantTaxReductionSchema.safeParse({ giverId: giver?.id ?? "", taxType, percent: percent === "" ? NaN : Number(percent), validUntil, reason });

  function review() {
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setConfirm(true);
  }

  function send() {
    if (!parsed.success) return;
    grant.mutate(parsed.data, {
      onSuccess: (r) => {
        toast.success(`Alert sent to ${r.giverName}`, { description: `${r.percent}% ${r.taxType} reduction granted until ${fmtDate(r.validUntil)}.` });
        setConfirm(false);
        setGiver(null);
        setPercent("");
        setReason("");
        setValidUntil(todayPlus(365));
      },
      onError: (e) => {
        setConfirm(false);
        toast.error(e.message);
      },
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
          <BadgePercent className="size-8 text-primary" aria-hidden /> Tax relief
        </h1>
        <p className="text-muted-foreground">Reduce the tax of a giver. When you confirm, the giver gets an alert in their panel.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Step n={1} title="Choose a giver">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Search givers"
              placeholder="Search by name or email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <div className={cn("mt-3 max-h-[26rem] overflow-y-auto rounded-2xl border", givers.isPlaceholderData && "opacity-60")}>
            {givers.isError ? (
              <ErrorState message={givers.error.message} onRetry={() => givers.refetch()} />
            ) : givers.isPending ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading givers...</p>
            ) : givers.data.items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No givers match this search.</p>
            ) : (
              <ul className="divide-y" role="radiogroup" aria-label="Givers">
                {givers.data.items.map((g) => {
                  const on = giver?.id === g.id;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          setGiver(g);
                          setErrors((e) => ({ ...e, giverId: "" }));
                        }}
                        className={cn("flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60", on && "bg-primary/10")}
                      >
                        <Avatar name={g.name} kind={g.kind} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{g.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {kindLabel(g.kind)} · {g.area || "No area"} · {g.email}
                          </span>
                        </span>
                        {g.status !== "ACTIVE" && <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10px] font-semibold text-clay">{g.status === "SUSPENDED" ? "Suspended" : "Appealing"}</span>}
                        {on && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {errors.giverId && <p role="alert" className="mt-2 text-sm text-clay">{errors.giverId}</p>}
          {givers.data && givers.data.total > givers.data.limit && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {givers.data.total} givers · page {page} of {Math.ceil(givers.data.total / givers.data.limit)}
              </span>
              <span className="flex gap-1.5">
                <Button variant="outline" size="icon" className="size-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" className="size-9" disabled={page * givers.data.limit >= givers.data.total} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <ChevronRight />
                </Button>
              </span>
            </div>
          )}
        </Step>

        <Step n={2} title="Reduction details">
          <div className="space-y-5">
            <div className={cn("flex items-center gap-3 rounded-2xl border p-3", giver ? "border-primary/40 bg-primary/5" : "border-dashed")}>
              {giver ? (
                <>
                  <Avatar name={giver.name} kind={giver.kind} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{giver.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{giver.email}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a giver on the left.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tax</Label>
              <div role="radiogroup" aria-label="Tax type" className="flex flex-wrap gap-2">
                {TAX_TYPES.map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={taxType === t} onClick={() => setTaxType(t)} className={cn("min-h-10 rounded-xl border px-4 text-sm font-medium transition-colors", taxType === t ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "bg-background hover:border-primary/50")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-percent">Reduction (%)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input id="tax-percent" type="number" inputMode="numeric" min={1} max={100} step={1} placeholder="e.g. 25" value={percent} onChange={(e) => setPercent(e.target.value)} className="h-11 w-28 rounded-xl" aria-invalid={!!errors.percent} />
                {QUICK.map((n) => (
                  <button key={n} type="button" onClick={() => setPercent(String(n))} className={cn("min-h-9 rounded-full border px-3 text-sm", percent === String(n) ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50")}>
                    {n}%
                  </button>
                ))}
              </div>
              {errors.percent && <p role="alert" className="text-sm text-clay">{errors.percent}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-until">Valid until</Label>
              <Input id="tax-until" type="date" min={todayPlus(1)} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-11 w-48 rounded-xl" aria-invalid={!!errors.validUntil} />
              {errors.validUntil && <p role="alert" className="text-sm text-clay">{errors.validUntil}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-reason">Reason (shown to the giver)</Label>
              <Textarea id="tax-reason" rows={3} maxLength={500} placeholder="e.g. Donated 1,200 meals this quarter" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} />
              {errors.reason && <p role="alert" className="text-sm text-clay">{errors.reason}</p>}
            </div>

            <Button onClick={review} className="h-11 w-full gap-2 rounded-xl">
              <BadgePercent className="size-4" aria-hidden /> Review &amp; confirm
            </Button>
          </div>
        </Step>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Granted reductions</h2>
        {history.isError ? (
          <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
        ) : history.isPending ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : history.data.length === 0 ? (
          <EmptyState art="plate" title="No reductions granted yet" description="Reductions you grant will be listed here." />
        ) : (
          <div className="overflow-x-auto rounded-[20px] border bg-surface shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giver</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="text-right">Reduction</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Granted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.giverName}</p>
                      <p className="text-xs text-muted-foreground">{r.giverEmail}</p>
                    </TableCell>
                    <TableCell>{r.taxType}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-primary">{r.percent}%</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDate(r.validUntil)}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-sm text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {timeAgo(r.createdAt)}
                      <span className="block text-xs">by {r.grantedBy}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={confirm} onOpenChange={(o) => !grant.isPending && setConfirm(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm tax reduction</DialogTitle>
            <DialogDescription>This is recorded and the giver is alerted straight away. Please check the details.</DialogDescription>
          </DialogHeader>
          {parsed.success && giver && (
            <dl className="space-y-2 rounded-2xl bg-muted p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Giver</dt><dd className="text-right font-medium">{giver.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Tax</dt><dd className="font-medium">{parsed.data.taxType}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Reduction</dt><dd className="font-display text-lg font-semibold text-primary">{parsed.data.percent}%</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Valid until</dt><dd className="font-medium">{fmtDate(parsed.data.validUntil)}</dd></div>
              <div><dt className="text-muted-foreground">Reason</dt><dd className="mt-0.5 font-medium">{parsed.data.reason}</dd></div>
            </dl>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={grant.isPending}>
              Back
            </Button>
            <Button onClick={send} disabled={grant.isPending} className="gap-2">
              <Send className="size-4" aria-hidden /> {grant.isPending ? "Sending..." : "Confirm & alert giver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
