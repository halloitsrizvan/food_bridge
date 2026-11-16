import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GovShell } from "@/components/gov/gov-shell";
import { PageSkeleton } from "@/components/shared/states";
import { getCurrentProfile } from "@/server/lib/auth";

async function Shell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/gov");
  if (profile.role !== "GOV") redirect("/dashboard");
  return <GovShell user={{ id: profile.id, name: profile.name, email: profile.email }}>{children}</GovShell>;
}

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
