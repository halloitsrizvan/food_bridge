"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Laptop, LogOut, Moon, Pencil, RotateCcw, Sun, Trash2, Wifi, WifiOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Avatar, kindLabel } from "@/components/shared/badges";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/client";
import { useMe, useOpenToReceive } from "@/lib/api/hooks";
import { useAppearance, type Appearance } from "@/lib/appearance";
import { clearOfflineData, useInstall, useOnline } from "@/lib/pwa";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { GIVER: "Food giver", TAKER: "Receiver", GOV: "Government admin" } as const;

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border bg-surface p-5 shadow-soft">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {sub && <p className="mb-4 text-sm text-muted-foreground">{sub}</p>}
      <div className={sub ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children || "-"}</dd>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string; style?: React.CSSProperties }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          style={o.style}
          className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition-colors", value === o.v ? "border-primary bg-primary/10 text-primary ring-1 ring-primary" : "bg-background hover:border-primary/50")}
        >
          {value === o.v && <Check className="size-4" aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t py-4 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const FONT_OPTIONS: { v: Appearance["font"]; label: string; style: React.CSSProperties }[] = [
  { v: "default", label: "Default", style: {} },
  { v: "system", label: "System", style: { fontFamily: "system-ui, sans-serif" } },
  { v: "serif", label: "Serif", style: { fontFamily: "Georgia, serif" } },
  { v: "mono", label: "Monospace", style: { fontFamily: "ui-monospace, monospace" } },
  { v: "readable", label: "Easy to read", style: { fontFamily: "var(--font-atkinson), system-ui, sans-serif" } },
];

function EditDetails({ name, phone, onDone }: { name: string; phone: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api("/api/v1/me", { method: "PATCH", body: { name: n.trim(), phone: p.trim() } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Name</Label>
        <Input id="pf-name" value={n} onChange={(e) => setN(e.target.value)} maxLength={80} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-phone">Phone</Label>
        <Input id="pf-phone" type="tel" value={p} onChange={(e) => setP(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={() => void save()} disabled={busy || n.trim().length < 2 || p.trim().length < 8} className="h-10 rounded-xl">
          {busy ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={busy} className="h-10 rounded-xl">
          <X className="size-4" aria-hidden /> Cancel
        </Button>
      </div>
    </div>
  );
}

export function ProfileSettings() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me, isPending, isError, error, refetch } = useMe();
  const openToReceive = useOpenToReceive();
  const { theme, setTheme } = useTheme();
  const { appearance, update, reset } = useAppearance();
  const online = useOnline();
  const install = useInstall();
  const [editing, setEditing] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false); // theme is only known on the client

  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!me) return <ErrorState message="Please log in to see your profile." onRetry={() => router.replace("/login")} />;

  const kind = me.giverKind ?? me.takerKind;

  async function logout() {
    await clearOfflineData();
    await createSupabaseBrowserClient().auth.signOut();
    qc.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profile &amp; settings</h1>
        <p className="text-muted-foreground">Your account details and how FoodBridge looks on this device.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your details">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} kind={kind} size={64} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold">{me.name}</p>
              <p className="text-sm text-muted-foreground">
                {ROLE_LABEL[me.role]}
                {kind ? ` · ${kindLabel(kind)}` : ""}
              </p>
              <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", me.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-clay/15 text-clay")}>{me.status === "ACTIVE" ? "Active" : me.status === "SUSPENDED" ? "Suspended" : "Appeal in review"}</span>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-9 gap-1.5 rounded-xl">
                <Pencil className="size-3.5" aria-hidden /> Edit
              </Button>
            )}
          </div>
          {editing && <EditDetails name={me.name} phone={me.phone} onDone={() => setEditing(false)} />}
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Row label="Email">{me.email}</Row>
            <Row label="Phone">{me.phone}</Row>
            {me.role !== "GOV" && <Row label="Address">{me.address}</Row>}
            <Row label="Area">{me.area}</Row>
            {me.role === "TAKER" && <Row label="People served">{me.members != null ? String(me.members) : ""}</Row>}
            {me.role === "GIVER" && <Row label="Points">{String(me.points)}</Row>}
            {me.role !== "GOV" && <Row label="Trust score">{`${me.trustScore} / 100`}</Row>}
            <Row label="Member since">{new Date(me.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</Row>
          </dl>
          {me.role === "TAKER" && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border bg-background p-4">
              <div>
                <p className="text-sm font-semibold">Open to receive food</p>
                <p className="text-xs text-muted-foreground">Givers can see you are available for offers nearby.</p>
              </div>
              <Switch checked={me.openToReceive} onCheckedChange={(v) => openToReceive.mutate(v)} aria-label="Open to receive food" />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Appearance" sub="Saved on this device only.">
            <SettingRow title="Theme">
              <Segmented
                label="Theme"
                value={(mounted ? (theme ?? "system") : "system") as "light" | "dark" | "system"}
                onChange={setTheme}
                options={[
                  { v: "light", label: "Light" },
                  { v: "dark", label: "Dark" },
                  { v: "system", label: "Auto" },
                ]}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {mounted && theme === "dark" ? <Moon className="size-3.5" aria-hidden /> : mounted && theme === "light" ? <Sun className="size-3.5" aria-hidden /> : <Laptop className="size-3.5" aria-hidden />}
                {theme === "system" || !theme ? "Follows your device setting." : `Always ${theme}.`}
              </p>
            </SettingRow>
            <SettingRow title="Text font">
              <Segmented label="Text font" value={appearance.font} onChange={(font) => update({ font })} options={FONT_OPTIONS} />
            </SettingRow>
            <SettingRow title="Text size" hint="Scales the whole app.">
              <Segmented
                label="Text size"
                value={appearance.size}
                onChange={(size) => update({ size })}
                options={[
                  { v: "sm", label: "Small", style: { fontSize: "0.8rem" } },
                  { v: "md", label: "Default" },
                  { v: "lg", label: "Large", style: { fontSize: "1.1rem" } },
                  { v: "xl", label: "Extra large", style: { fontSize: "1.2rem" } },
                ]}
              />
            </SettingRow>
            <SettingRow title="Reduce motion" hint="Turns off animations and transitions.">
              <div className="flex items-center gap-3">
                <Switch checked={appearance.motion === "reduce"} onCheckedChange={(v) => update({ motion: v ? "reduce" : "full" })} aria-label="Reduce motion" />
                <span className="text-sm text-muted-foreground">{appearance.motion === "reduce" ? "On" : "Off"}</span>
              </div>
            </SettingRow>
            <p className="rounded-xl bg-background p-3 text-sm">The quick brown fox shares surplus food before it spoils. 0123456789</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-9 gap-1.5"
              onClick={() => {
                reset();
                setTheme("system");
                toast.success("Appearance reset");
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset to defaults
            </Button>
          </Card>

          <Card title="App & offline" sub="Install FoodBridge and keep using pages you have opened without a connection.">
            <div className="space-y-3">
              <p className={cn("flex items-center gap-2 text-sm font-medium", online ? "text-primary" : "text-clay")}>
                {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
                {online ? "You are online" : "You are offline: showing saved pages"}
              </p>
              {install.installed ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" aria-hidden /> Installed on this device.
                </p>
              ) : install.canPrompt ? (
                <Button onClick={() => void install.install()} className="h-11 gap-2 rounded-xl">
                  <Download className="size-4" aria-hidden /> Install app
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{install.ios ? "On iPhone/iPad: tap Share, then “Add to Home Screen”." : "Use your browser menu and choose “Install app” or “Add to Home screen”."}</p>
              )}
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl"
                onClick={async () => {
                  await clearOfflineData();
                  toast.success("Saved offline data cleared");
                }}
              >
                <Trash2 className="size-4" aria-hidden /> Clear saved offline data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Button variant="outline" onClick={() => void logout()} className="h-11 gap-2 rounded-xl text-clay">
        <LogOut className="size-4" aria-hidden /> Log out
      </Button>
    </div>
  );
}
