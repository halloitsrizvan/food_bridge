"use client";

import { Building2, HandHeart, ShieldCheck, Soup } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const PASSWORD = "FoodBridge#2026";
const ACCOUNTS = [
  { email: "demo.giver@foodbridge.demo", label: "Giver", sub: "Restaurant / donor", icon: HandHeart, to: "/dashboard" },
  { email: "demo.receiver@foodbridge.demo", label: "Receiver", sub: "Shelter / charity", icon: Soup, to: "/dashboard" },
  { email: "gov@foodbridge.demo", label: "Admin", sub: "Government", icon: ShieldCheck, to: "/gov" },
];

export function DemoAccounts() {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function open(a: (typeof ACCOUNTS)[number]) {
    setBusy(a.email);
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: a.email, password: PASSWORD });
    if (error) {
      setBusy(null);
      return toast.error("Demo account is not available yet");
    }
    await qc.invalidateQueries({ queryKey: ["me"] });
    router.replace(a.to);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Building2 className="size-4 text-primary" aria-hidden /> Try a demo account
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">One tap to sign in. Password for all: {PASSWORD}</p>
      <div className="mt-3 grid gap-2">
        {ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={busy !== null}
            onClick={() => void open(a)}
            className="flex min-h-12 items-center gap-3 rounded-xl border bg-background px-3 text-left transition-colors hover:border-primary disabled:opacity-60"
          >
            <a.icon className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{busy === a.email ? "Signing in..." : `${a.label} · ${a.sub}`}</span>
              <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
