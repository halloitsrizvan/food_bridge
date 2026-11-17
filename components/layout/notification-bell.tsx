"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMarkRead, useNotifications } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Bell with live unread badge. Supabase Realtime pushes new rows; polling is the fallback. */
export function NotificationBell({ userId, basePath = "/dashboard" }: { userId: string; basePath?: string }) {
  const qc = useQueryClient();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const unread = data?.unread ?? 0;

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    const ch = sb
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as { title?: string; body?: string };
        toast(n.title ?? "New notification", { description: n.body });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["my-claims"] });
        qc.invalidateQueries({ queryKey: ["claim"] });
        qc.invalidateQueries({ queryKey: ["chat-inbox"] });
        qc.invalidateQueries({ queryKey: ["chat-thread"] });
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [userId, qc]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-11 place-items-center rounded-xl hover:bg-muted" aria-label={`Notifications, ${unread} unread`}>
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-5 place-items-center rounded-full bg-clay px-1 text-[11px] font-bold leading-5 text-white" aria-hidden>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-display font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" onClick={() => markRead.mutate(undefined)} disabled={!unread} className="gap-1">
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto" aria-live="polite">
          {!data?.items.length && <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet. We will tell you when food is near.</p>}
          {data?.items.slice(0, 8).map((n) => (
            <Link key={n.id} href={n.link || `${basePath}/notifications`} onClick={() => !n.readAt && markRead.mutate([n.id])} className={cn("block border-b px-4 py-3 last:border-0 hover:bg-muted", !n.readAt && "bg-primary/5")}>
              <p className="flex items-center gap-2 text-sm font-medium">
                {!n.readAt && <span className="size-2 rounded-full bg-primary" aria-label="unread" />}
                {n.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
            </Link>
          ))}
        </div>
        <Link href={`${basePath}/notifications`} className="block border-t px-4 py-3 text-center text-sm font-medium text-primary hover:bg-muted">
          See all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
