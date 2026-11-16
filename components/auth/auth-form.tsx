"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, HandHeart, Soup } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api/client";
import { LoginSchema, SignupSchema } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0..4
}
const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-clay">
          {error}
        </p>
      )}
    </div>
  );
}

export function LoginForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof LoginSchema>>({ resolver: zodResolver(LoginSchema) });

  async function submit(v: z.infer<typeof LoginSchema>) {
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword(v);
    setBusy(false);
    if (error) return toast.error("Email or password is incorrect");
    await qc.invalidateQueries({ queryKey: ["me"] });
    if (onDone) return onDone();
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" className="h-11 rounded-xl" {...register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Input type={show ? "text" : "password"} autoComplete="current-password" className="h-11 rounded-xl pr-11" {...register("password")} aria-invalid={!!errors.password} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
        {busy ? "Signing in..." : "Log in"}
      </Button>
      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      )}
    </form>
  );
}

const ROLES = [
  { v: "GIVER" as const, icon: HandHeart, title: "I give food", sub: "Restaurant, caterer, home or event" },
  { v: "TAKER" as const, icon: Soup, title: "I need food", sub: "Institution, charity or family" },
];

export function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.input<typeof SignupSchema>>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { role: "GIVER" },
  });
  const role = watch("role");
  const pw = watch("password") ?? "";
  const s = strength(pw);

  async function submit(v: z.infer<typeof SignupSchema>) {
    setBusy(true);
    try {
      await api("/api/v1/auth/signup", { method: "POST", body: v });
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) throw new Error("Account created, but sign-in failed. Please log in.");
      toast.success("Welcome to FoodBridge");
      router.replace("/onboarding");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiClientError || e instanceof Error ? e.message : "Could not sign up");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">I am joining as</legend>
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {ROLES.map((r) => (
            <button
              key={r.v}
              type="button"
              role="radio"
              aria-checked={role === r.v}
              onClick={() => setValue("role", r.v)}
              className={cn("flex min-h-[88px] flex-col items-start gap-1 rounded-2xl border-2 p-3.5 text-left transition-all", role === r.v ? "border-primary bg-primary/8 shadow-soft" : "border-line bg-surface hover:border-primary/40")}
            >
              <r.icon className={cn("size-6", role === r.v ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span className="font-display text-sm font-semibold">{r.title}</span>
              <span className="text-xs text-muted-foreground">{r.sub}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" className="h-11 rounded-xl" {...register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel" placeholder="+91 98470 12345" className="h-11 rounded-xl" {...register("phone")} aria-invalid={!!errors.phone} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <div className="relative">
          <Input type={show ? "text" : "password"} autoComplete="new-password" className="h-11 rounded-xl pr-11" {...register("password")} aria-invalid={!!errors.password} />
          <button type="button" onClick={() => setShow((x) => !x)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i <= s ? (s >= 3 ? "var(--urgent-safe)" : s === 2 ? "var(--urgent-amber)" : "var(--urgent-orange)") : "var(--line)" }} />
            ))}
          </div>
          <span className="w-16 text-right text-xs text-muted-foreground">{pw ? STRENGTH[s] : ""}</span>
        </div>
      </Field>
      <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
        {busy ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}
