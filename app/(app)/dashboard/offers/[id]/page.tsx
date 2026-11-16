"use client";

import { use } from "react";
import { OfferPage } from "@/components/dashboard/offer-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OfferPage id={id} />;
}
