import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/states";
import { requireRole } from "@/server/lib/auth";
import { redirect } from "next/navigation";

async function AdminOnly() {
  try {
    await requireRole("ADMIN");
  } catch {
    redirect("/dashboard");
  }
  return <h1 className="text-2xl font-semibold">Admin area</h1>;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOnly />
    </Suspense>
  );
}
