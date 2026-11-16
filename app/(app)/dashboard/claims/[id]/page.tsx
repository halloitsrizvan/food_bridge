"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";
import { ClaimScreen } from "@/components/claims/claim-screen";

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Opening the giver's QR with a phone camera lands here with ?code=123456 pre-filled.
  const code = useSearchParams().get("code") ?? undefined;
  return <ClaimScreen id={id} initialCode={code} />;
}
