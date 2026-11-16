"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import type { Role } from "@/lib/schemas/profile";

// Add nav items here. `roles` omitted = visible to everyone signed in.
const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/admin", label: "Admin", roles: ["ADMIN"] },
];

export function AppShell({
  user,
  children,
}: {
  user: { email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  async function logout() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-md px-3 py-2 text-sm hover:bg-muted",
            pathname === n.href && "bg-muted font-medium",
          )}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <MenuIcon />
        </Button>
        <Link href="/dashboard" className="font-semibold">
          App
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md border px-3 py-1.5 text-sm">
              Account
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r md:block">{nav}</aside>
        {open && <aside className="absolute inset-x-0 top-14 z-20 border-b bg-background md:hidden">{nav}</aside>}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
