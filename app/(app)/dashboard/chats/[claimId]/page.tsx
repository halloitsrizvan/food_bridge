"use client";

import { use } from "react";
import { ChatThreadPage } from "@/components/chat/handover-chat";

export default function Page({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = use(params);
  return <ChatThreadPage claimId={claimId} />;
}
