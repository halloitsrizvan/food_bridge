"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CredentialsSchema } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string[]; password?: string[] }>({});
  const isLogin = mode === "login";

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = CredentialsSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return setErrors(parsed.error.flatten().fieldErrors);
    setErrors({});
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword(parsed.data)
      : await supabase.auth.signUp(parsed.data);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!isLogin && !data.session) return toast.success("Check your email to confirm your account");
    // Only same-site relative paths are allowed as redirect targets.
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isLogin ? "Log in" : "Create account"}</CardTitle>
          <CardDescription>Email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" />
              {errors.email && <p className="text-sm text-destructive">{errors.email[0]}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password[0]}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "No account? " : "Have an account? "}
              <Link className="underline" href={isLogin ? "/signup" : "/login"}>
                {isLogin ? "Sign up" : "Log in"}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
