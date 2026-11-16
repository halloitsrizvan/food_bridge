"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell, HandHeart, MapPin, Home, Inbox, LayoutDashboard, LogOut, PlusCircle, ShieldAlert, Soup, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppeal, usePendingReview } from "@/lib/api/hooks";
import type { ProfileDTO } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/badges";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function navFor(role: ProfileDTO["role"]): Item[] {
  const base: Item[] = [{ href: "/dashboard", label: "Home", icon: LayoutDashboard }];
  if (role === "GIVER") base.push({ href: "/dashboard/post", label: "Post food", icon: PlusCircle });
  if (role === "TAKER") base.push({ href: "/dashboard/needs/new", label: "Post a need", icon: PlusCircle });
  base.push({ href: "/dashboard/nearby", label: "Nearby", icon: MapPin }, { href: "/dashboard/claims", label: "Handovers", icon: Inbox }, { href: "/dashboard/notifications", label: "Alerts", icon: Bell });
  return base;
}

function AppealBanner({ status }: { status: ProfileDTO["status"] }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const appeal = useAppeal();
  if (status === "ACTIVE") return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-clay/30 bg-clay/10 px-4 py-3 text-sm">
      <ShieldAlert className="size-5 shrink-0 text-clay" aria-hidden />
      <p className="min-w-0 flex-1">
        {status === "SUSPENDED" ? "Your account is suspended. You can browse, but posting, claiming and reviews are disabled." : "Your appeal is being reviewed by the government team."}
      </p>
      {status === "SUSPENDED" && (
        <>
          <Button size="sm" className="h-9 rounded-lg bg-clay text-white hover:bg-clay/90" onClick={() => setOpen(true)}>
            Submit appeal
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Appeal your suspension</DialogTitle>
                <DialogDescription>Tell the reviewer what happened. They will approve or reject it.</DialogDescription>
              </DialogHeader>
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} maxLength={1000} placeholder="What happened, and what will you do differently?" aria-label="Appeal message" />
              <DialogFooter>
                <Button
                  disabled={msg.trim().length < 10 || appeal.isPending}
                  onClick={() =>
                    appeal.mutate(msg, {
                      onSuccess: () => {
                        toast.success("Appeal sent");
                        setOpen(false);
                      },
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  {appeal.isPending ? "Sending..." : "Send appeal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function ReviewBanner() {
  const { data } = usePendingReview();
  if (!data) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-saffron/40 bg-saffron/20 px-4 py-3 text-sm">
      <Star className="size-5 shrink-0 text-[#b7791f]" aria-hidden />
      <p className="min-w-0 flex-1">
        Rate <b>{data.otherName}</b> for “{data.title}” to keep requesting food. Reviews are required.
      </p>
      <Link href={`/dashboard/claims/${data.claimId}`} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
        Rate now
      </Link>
    </div>
  );
}

export function AppShell({ user, children }: { user: ProfileDTO; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const items = navFor(user.role);
  const active = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const RoleIcon = user.role === "GIVER" ? HandHeart : Soup;

  async function logout() {
    await createSupabaseBrowserClient().auth.signOut();
    qc.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/" className="mb-6 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {items.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", active(n.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <n.icon className="size-5" aria-hidden /> {n.label}
            </Link>
          ))}
        </nav>
        {/* only the public feed link sits at the bottom, right above the profile card */}
        <Link href="/" className="mb-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted">
          <Home className="size-5" aria-hidden /> Public feed
        </Link>
        <div className="rounded-2xl border bg-surface p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} kind={user.giverKind ?? user.takerKind} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <RoleIcon className="size-3" aria-hidden /> {user.role === "GIVER" ? "Giver" : "Receiver"}
              </p>
            </div>
          </div>
          {user.role === "GIVER" && <p className="mt-2 text-xs tabular text-muted-foreground">{user.points} points</p>}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-0.5 border-b bg-background/90 px-2 backdrop-blur sm:gap-1 sm:px-3 md:px-6">
          <Link href="/dashboard" className="md:hidden">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={user.id} />
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-11 place-items-center rounded-xl hover:bg-muted" aria-label="Account menu">
                <Avatar name={user.name} kind={user.giverKind ?? user.takerKind} size={32} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="gap-2">
                  <LogOut className="size-4" aria-hidden /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <AppealBanner status={user.status} />
        <ReviewBanner />
        <main id="main" className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-4 sm:pt-6 md:px-8 md:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Main">
        {items.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active(n.href) ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="size-5" aria-hidden /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
