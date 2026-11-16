"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#live", label: "Browse food" },
  { href: "#how", label: "How it works" },
  { href: "#trust", label: "Trust & rewards" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const home = me ? (me.role === "GOV" ? "/gov" : "/dashboard") : null;
  const cta = me ? { href: me.role === "GIVER" ? "/dashboard/post" : home!, label: me.role === "GIVER" ? "Share food" : "Dashboard" } : { href: "/signup", label: "Share food" };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label="FoodBridge home">
          <Logo />
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!me && (
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden h-10 rounded-xl sm:inline-flex")}>
              Log in
            </Link>
          )}
          <Link href={cta.href} className={cn(buttonVariants(), "h-10 rounded-xl px-4")}>
            {cta.label}
          </Link>
          <button type="button" className="grid size-11 place-items-center rounded-xl hover:bg-muted md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background px-4 py-2 md:hidden" aria-label="Sections">
          {[...LINKS, ...(me ? [] : [{ href: "/login", label: "Log in" }])].map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-2 text-sm font-medium">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
