"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGovUsers, useSetUserStatus, type GovUser } from "@/lib/api/hooks";
import { KIND_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  SUSPENDED: "bg-clay/15 text-clay",
  APPEALING: "bg-saffron/25 text-[#8a5a0b] dark:text-saffron",
};

const sel = "h-10 rounded-xl border bg-surface px-3 text-sm";

export function GovUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useGovUsers({ q: q || undefined, role: role || undefined, status: status || undefined, page });
  const setUser = useSetUserStatus();
  const [target, setTarget] = useState<{ u: GovUser; to: "ACTIVE" | "SUSPENDED" } | null>(null);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Users</h1>
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search users" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-10 max-w-xs rounded-xl" />
        <select aria-label="Role" className={sel} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option><option value="GIVER">Givers</option><option value="TAKER">Receivers</option><option value="GOV">Government</option>
        </select>
        <select aria-label="Status" className={sel} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="APPEALING">Appealing</option>
        </select>
      </div>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data.items.length === 0 ? <EmptyState art="search" title="No users match" /> : (
        <div className={cn("overflow-x-auto rounded-[20px] border bg-surface shadow-soft", isPlaceholderData && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Area</TableHead><TableHead className="text-right">Trust</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></TableCell>
                  <TableCell>{u.role === "GOV" ? "Government" : (KIND_LABEL[u.kind ?? ""] ?? u.role)}</TableCell>
                  <TableCell>{u.area || "-"}</TableCell>
                  <TableCell className="text-right tabular">{u.trustScore}</TableCell>
                  <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_PILL[u.status])}>{u.status.toLowerCase()}</span></TableCell>
                  <TableCell className="text-right">
                    {u.role !== "GOV" && (u.status === "ACTIVE" ? (
                      <Button size="sm" variant="outline" className="rounded-lg text-clay" onClick={() => setTarget({ u, to: "SUSPENDED" })}>Suspend</Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setTarget({ u, to: "ACTIVE" })}>Reactivate</Button>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{data.total} users</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page * data.limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target?.to === "SUSPENDED" ? `Suspend ${target?.u.name}?` : `Reactivate ${target?.u.name}?`}
        description={target?.to === "SUSPENDED" ? "Their open posts are hidden and they cannot post or claim until reactivated." : "They can post and claim again."}
        confirmLabel={target?.to === "SUSPENDED" ? "Suspend" : "Reactivate"}
        destructive={target?.to === "SUSPENDED"}
        busy={setUser.isPending}
        onConfirm={() => target && setUser.mutate({ id: target.u.id, status: target.to }, { onSuccess: () => { toast.success("Updated"); setTarget(null); }, onError: (e) => toast.error(e.message) })}
      />
    </div>
  );
}
