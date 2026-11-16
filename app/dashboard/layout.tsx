import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/shared/states";
import { getCurrentProfile } from "@/server/lib/auth";

// Reads the session (request-time data), so it streams in behind Suspense.
async function Shell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return <AppShell user={{ email: profile.email, role: profile.role }}>{children}</AppShell>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
