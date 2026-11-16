"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Gavel, LayoutDashboard, LogOut, Map, MessageSquareWarning, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/gov", label: "Overview", icon: LayoutDashboard },
  { href: "/gov/map", label: "Live map", icon: Map },
  { href: "/gov/users", label: "Users", icon: Users },
  { href: "/gov/complaints", label: "Complaints", icon: MessageSquareWarning },
  { href: "/gov/appeals", label: "Appeals", icon: Gavel },
  { href: "/gov/config", label: "Config", icon: Settings2 },
];

export function GovShell({ user, children }: { user: { id: string; name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const active = (h: string) => (h === "/gov" ? pathname === h : pathname.startsWith(h));
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 lg:flex">
        <Link href="/gov" className="mb-1 px-2"><Logo /></Link>
        <p className="mb-6 px-2 text-xs font-semibold uppercase tracking-wide text-clay">Government console</p>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Government">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium", active(n.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <n.icon className="size-5" aria-hidden /> {n.label}
            </Link>
          ))}
        </nav>
        <p className="truncate px-2 text-xs text-muted-foreground">{user.email}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <nav className="flex gap-1 overflow-x-auto lg:hidden" aria-label="Government">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium", active(n.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground")}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={user.id} basePath="/gov" />
            <Button variant="ghost" className="h-11 gap-2 rounded-xl" onClick={async () => { await createSupabaseBrowserClient().auth.signOut(); qc.clear(); router.replace("/login"); router.refresh(); }}>
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <main id="main" className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
