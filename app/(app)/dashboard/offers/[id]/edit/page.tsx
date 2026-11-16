"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { PostFoodForm } from "@/components/forms/post-food-form";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { buttonVariants } from "@/components/ui/button";
import { useMyOffers, useSafeHours } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isPending, isError, error, refetch } = useMyOffers();
  const cfg = useSafeHours().data;
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const offer = data.find((o) => o.id === id);
  if (!offer) return <EmptyState title="Post not found" description="It may belong to another account." action={<Link href="/dashboard" className={cn(buttonVariants(), "rounded-full")}>Back to dashboard</Link>} />;
  if (offer.status !== "OPEN")
    return (
      <EmptyState
        title="This post can no longer be edited"
        description="Only open posts can be changed. Once someone has contacted you, finish or decline that request first."
        action={<Link href={`/dashboard/offers/${id}`} className={cn(buttonVariants(), "rounded-full")}>View post</Link>}
      />
    );
  return (
    <div className="space-y-6">
      <Link href={`/dashboard/offers/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to post
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Edit post</h1>
        <p className="text-muted-foreground">Changing the times recalculates how long the food stays safe.</p>
      </div>
      <PostFoodForm photosEnabled={!!cfg?.photos} initial={offer} />
    </div>
  );
}
