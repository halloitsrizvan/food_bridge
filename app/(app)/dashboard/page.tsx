"use client";

import { GiverHome } from "@/components/dashboard/giver-home";
import { TakerHome } from "@/components/dashboard/taker-home";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { useMe } from "@/lib/api/hooks";

export default function DashboardPage() {
  const { data: me, isPending, isError, refetch } = useMe();
  if (isPending) return <PageSkeleton />;
  if (isError || !me) return <ErrorState message="Could not load your profile" onRetry={() => refetch()} />;
  return me.role === "GIVER" ? <GiverHome me={me} /> : <TakerHome me={me} />;
}
