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
import { fmt, LANGS, useLang, useT } from "@/lib/i18n";
import { clearOfflineData, useInstall, useOnline } from "@/lib/pwa";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";


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

const FONT_STYLES: Record<Appearance["font"], React.CSSProperties> = {
  default: {},
  system: { fontFamily: "system-ui, sans-serif" },
  serif: { fontFamily: "Georgia, serif" },
  mono: { fontFamily: "ui-monospace, monospace" },
  readable: { fontFamily: "var(--font-atkinson), system-ui, sans-serif" },
};

function EditDetails({ name, phone, onDone }: { name: string; phone: string; onDone: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api("/api/v1/me", { method: "PATCH", body: { name: n.trim(), phone: p.trim() } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(t.profile.updated);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.profile.saveFail);
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">{t.profile.name}</Label>
        <Input id="pf-name" value={n} onChange={(e) => setN(e.target.value)} maxLength={80} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-phone">{t.profile.phone}</Label>
        <Input id="pf-phone" type="tel" value={p} onChange={(e) => setP(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={() => void save()} disabled={busy || n.trim().length < 2 || p.trim().length < 8} className="h-10 rounded-xl">
          {busy ? t.common.saving : t.common.save}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={busy} className="h-10 rounded-xl">
          <X className="size-4" aria-hidden /> {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}

export function ProfileSettings() {
  const t = useT();
  const { lang, setLang } = useLang();
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
  if (!me) return <ErrorState message={t.profile.loginNeeded} onRetry={() => router.replace("/login")} />;

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
        <h1 className="font-display text-3xl font-semibold">{t.profile.title}</h1>
        <p className="text-muted-foreground">{t.profile.sub}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t.profile.details}>
          <div className="flex items-center gap-4">
            <Avatar name={me.name} kind={kind} size={64} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-semibold">{me.name}</p>
              <p className="text-sm text-muted-foreground">
                {me.role === "GIVER" ? t.profile.roleGiver : me.role === "TAKER" ? t.profile.roleTaker : t.profile.roleGov}
                {kind ? ` · ${kindLabel(kind)}` : ""}
              </p>
              <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", me.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-clay/15 text-clay")}>{me.status === "ACTIVE" ? t.profile.statusActive : me.status === "SUSPENDED" ? t.profile.statusSuspended : t.profile.statusAppealing}</span>
            </div>
            {!editing && me.role !== "GOV" && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-9 gap-1.5 rounded-xl">
                <Pencil className="size-3.5" aria-hidden /> {t.common.edit}
              </Button>
            )}
          </div>
          {editing && me.role !== "GOV" && <EditDetails name={me.name} phone={me.phone} onDone={() => setEditing(false)} />}
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Row label={t.profile.email}>{me.email}</Row>
            <Row label={t.profile.phone}>{me.phone}</Row>
            {me.role !== "GOV" && <Row label={t.profile.address}>{me.address}</Row>}
            <Row label={t.profile.area}>{me.area}</Row>
            {me.role === "TAKER" && <Row label={t.profile.members}>{me.members != null ? String(me.members) : ""}</Row>}
            {me.role === "GIVER" && <Row label={t.profile.points}>{String(me.points)}</Row>}
            {me.role !== "GOV" && <Row label={t.profile.trust}>{`${me.trustScore} / 100`}</Row>}
            <Row label={t.profile.since}>{new Date(me.createdAt).toLocaleDateString(lang === "ml" ? "ml-IN" : lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" })}</Row>
          </dl>
          {me.role === "TAKER" && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border bg-background p-4">
              <div>
                <p className="text-sm font-semibold">{t.profile.openToReceive}</p>
                <p className="text-xs text-muted-foreground">{t.profile.openToReceiveSub}</p>
              </div>
              <Switch checked={me.openToReceive} onCheckedChange={(v) => openToReceive.mutate(v)} aria-label={t.profile.openToReceive} />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={t.profile.appearance} sub={t.profile.appearanceSub}>
            <SettingRow title={t.profile.language} hint={t.profile.languageHint}>
              <Segmented label={t.profile.language} value={lang} onChange={setLang} options={LANGS.map((l) => ({ v: l.code, label: l.native }))} />
            </SettingRow>
            <SettingRow title={t.profile.theme}>
              <Segmented
                label={t.profile.theme}
                value={(mounted ? (theme ?? "system") : "system") as "light" | "dark" | "system"}
                onChange={setTheme}
                options={[
                  { v: "light", label: t.profile.light },
                  { v: "dark", label: t.profile.dark },
                  { v: "system", label: t.profile.auto },
                ]}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {mounted && theme === "dark" ? <Moon className="size-3.5" aria-hidden /> : mounted && theme === "light" ? <Sun className="size-3.5" aria-hidden /> : <Laptop className="size-3.5" aria-hidden />}
                {theme === "system" || !theme ? t.profile.followsDevice : fmt(t.profile.always, { theme: theme === "dark" ? t.profile.dark : t.profile.light })}
              </p>
            </SettingRow>
            <SettingRow title={t.profile.font}>
              <Segmented
                label={t.profile.font}
                value={appearance.font}
                onChange={(font) => update({ font })}
                options={[
                  { v: "default", label: t.profile.fontDefault, style: FONT_STYLES.default },
                  { v: "system", label: t.profile.fontSystem, style: FONT_STYLES.system },
                  { v: "serif", label: t.profile.fontSerif, style: FONT_STYLES.serif },
                  { v: "mono", label: t.profile.fontMono, style: FONT_STYLES.mono },
                  { v: "readable", label: t.profile.fontReadable, style: FONT_STYLES.readable },
                ]}
              />
            </SettingRow>
            <SettingRow title={t.profile.size} hint={t.profile.sizeHint}>
              <Segmented
                label={t.profile.size}
                value={appearance.size}
                onChange={(size) => update({ size })}
                options={[
                  { v: "sm", label: t.profile.sizeSm, style: { fontSize: "0.8rem" } },
                  { v: "md", label: t.profile.sizeMd },
                  { v: "lg", label: t.profile.sizeLg, style: { fontSize: "1.1rem" } },
                  { v: "xl", label: t.profile.sizeXl, style: { fontSize: "1.2rem" } },
                ]}
              />
            </SettingRow>
            <SettingRow title={t.profile.motion} hint={t.profile.motionHint}>
              <div className="flex items-center gap-3">
                <Switch checked={appearance.motion === "reduce"} onCheckedChange={(v) => update({ motion: v ? "reduce" : "full" })} aria-label={t.profile.motion} />
                <span className="text-sm text-muted-foreground">{appearance.motion === "reduce" ? t.common.on : t.common.off}</span>
              </div>
            </SettingRow>
            <p className="rounded-xl bg-background p-3 text-sm">{t.profile.sample}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-9 gap-1.5"
              onClick={() => {
                reset();
                setTheme("system");
                toast.success(t.profile.resetDone);
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden /> {t.profile.reset}
            </Button>
          </Card>

          <Card title={t.profile.app} sub={t.profile.appSub}>
            <div className="space-y-3">
              <p className={cn("flex items-center gap-2 text-sm font-medium", online ? "text-primary" : "text-clay")}>
                {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
                {online ? t.profile.online : t.profile.offlineNow}
              </p>
              {install.installed ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" aria-hidden /> {t.profile.installed}
                </p>
              ) : install.canPrompt ? (
                <Button onClick={() => void install.install()} className="h-11 gap-2 rounded-xl">
                  <Download className="size-4" aria-hidden /> {t.profile.install}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">{install.ios ? t.profile.iosHint : t.profile.browserHint}</p>
              )}
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl"
                onClick={async () => {
                  await clearOfflineData();
                  toast.success(t.profile.cleared);
                }}
              >
                <Trash2 className="size-4" aria-hidden /> {t.profile.clearOffline}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Button variant="outline" onClick={() => void logout()} className="h-11 gap-2 rounded-xl text-clay">
        <LogOut className="size-4" aria-hidden /> {t.common.logout}
      </Button>
    </div>
  );
}
