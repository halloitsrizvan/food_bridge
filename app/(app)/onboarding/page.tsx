import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { PageSkeleton } from "@/components/shared/states";
import { getCurrentProfile } from "@/server/lib/auth";

export const metadata = { title: "Set up your profile" };

async function Gate() {
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
