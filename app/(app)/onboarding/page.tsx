import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { PageSkeleton } from "@/components/shared/states";
import { getCurrentProfile } from "@/server/lib/auth";

export const metadata = { title: "Set up your profile" };

async function Gate() {
  await connection(); // request-time only: session + DB
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "GOV") redirect("/gov");
  if (profile.onboarded) redirect("/dashboard");
  return <OnboardingWizard role={profile.role} defaultName={profile.name} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl p-8"><PageSkeleton /></div>}>
      <Gate />
    </Suspense>
  );
}

// These routes read the session (request-time data) and block on the server by design.
export const instant = false;
