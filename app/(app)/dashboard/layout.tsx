import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/shared/states";
import { getCurrentProfile } from "@/server/lib/auth";
import { profileService } from "@/server/services/profile.service";

// Reads the session (request-time data), so it streams in behind Suspense.
async function Shell({ children }: { children: React.ReactNode }) {
  await connection(); // request-time only: session + DB
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "GOV") redirect("/gov");
  if (!profile.onboarded) redirect("/onboarding");
  return <AppShell user={await profileService.toDTO(profile)}>{children}</AppShell>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

// These routes read the session (request-time data) and block on the server by design.
export const instant = false;
