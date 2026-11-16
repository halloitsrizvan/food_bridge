"use client";

import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { ImageUpload } from "@/components/shared/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/lib/api/hooks";

export default function DashboardPage() {
  const { data, isPending, error, refetch } = useMe();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome{data.name ? `, ${data.name}` : ""}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Email: {data.email}</p>
          <p>Role: {data.role}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Image upload (demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload folder="uploads" onUploaded={() => {}} />
        </CardContent>
      </Card>
    </div>
  );
}
