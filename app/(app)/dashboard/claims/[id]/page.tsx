"use client";

import { use } from "react";
import { ClaimScreen } from "@/components/claims/claim-screen";

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClaimScreen id={id} />;
}
