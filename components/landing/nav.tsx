"use client";

import { ArrowUpRight, HeartHandshake, LayoutGrid, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/lib/api/hooks";
import { requestLocation, useLocation } from "@/lib/use-location";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#live", label: "Browse food" },
  { href: "#deals", label: "Expiring soon" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function setFeedFilter(detail: { q?: string; category?: string; diet?: string }) {
  window.dispatchEvent(new CustomEvent("fb:filter", { detail }));
  document.getElementById("live")?.scrollIntoView({ behavior: "smooth" });
}

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const { data: me } = useMe();
  const loc = useLocation();
  // Compact mode after scrolling: second row collapses, links move beside a smaller search.
  // Hysteresis (90 / 20 px) stops flicker when the header height change shifts the page.
  useEffect(() => {
    const on = () => setScrolled((prev) => window.scrollY > (prev ? 20 : 90));
    window.addEventListener("scroll", on, { passive: true });
    const id = requestAnimationFrame(on);
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(id);
    };
  }, []);
  const dash = me ? (me.role === "GOV" ? "/gov" : "/dashboard") : null;
  const cta = me ? { href: me.role === "GIVER" ? "/dashboard/post" : dash!, label: me.role === "GIVER" ? "Share food" : "Dashboard" } : { href: "/signup", label: "Share food" };

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="bg-primary px-4 py-2 text-center text-xs text-primary-foreground sm:text-[13px]">
        Surplus food is matched and handed over within <b className="text-saffron">20 minutes</b>{" "}
        {loc.place ? (
          <>
            near <b>{loc.place}</b>
          </>
        ) : loc.status === "asking" ? (
          "near you (locating...)"
        ) : (
          <>
            in your area ·{" "}
            <button type="button" onClick={() => requestLocation(true)} className="font-semibold underline underline-offset-2">
              use my location
            </button>
          </>
        )}{" "}
        · <b>Free, government run</b>
      </div>
      <div className="border-b">
        <div className={cn("mx-auto flex max-w-[1680px] items-center gap-4 px-4 transition-[height] duration-300 sm:px-8", scrolled ? "h-16" : "h-[72px]")}>
          <Link href="/" aria-label="FoodBridge home">
            <Logo />
          </Link>
          <nav className={cn("ml-4 hidden items-center gap-6 text-sm font-medium", scrolled && "md:flex")} aria-label="Sections" aria-hidden={!scrolled}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} tabIndex={scrolled ? 0 : -1} className="whitespace-nowrap text-foreground/80 hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
          <form
            role="search"
            className={cn("relative hidden transition-all duration-300 md:block", scrolled ? "ml-auto w-60 max-w-[15rem]" : "mx-auto max-w-xl flex-1")}
            onSubmit={(e) => {
              e.preventDefault();
              setFeedFilter({ q });
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              aria-label="Search food"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search biryani, sadhya, bread..."
              className={cn("w-full rounded-full border bg-secondary pl-11 pr-4 text-sm outline-none transition-[height] duration-300 placeholder:text-muted-foreground focus:border-primary focus:bg-background", scrolled ? "h-10" : "h-11")}
            />
          </form>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <ThemeToggle />
            {!me && (
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden h-10 px-4 sm:inline-flex")}>
                Log in
              </Link>
            )}
            <Link href={cta.href} className={cn(buttonVariants(), "h-10 gap-1.5 pl-5 pr-2")}>
              {cta.label}
              <span className="grid size-6 place-items-center rounded-full bg-background text-primary">
                <ArrowUpRight className="size-3.5" aria-hidden />
              </span>
            </Link>
            <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-muted md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      <div className={cn("hidden grid-rows-[1fr] transition-[grid-template-rows] duration-300 md:grid", scrolled && "grid-rows-[0fr]")} inert={scrolled}>
        <div className="min-h-0 overflow-hidden border-b">
        <nav className="mx-auto flex h-12 max-w-[1680px] items-center gap-6 px-4 text-sm font-medium sm:px-8" aria-label="Page sections">
          <button type="button" onClick={() => setFeedFilter({})} className="flex items-center gap-2 text-foreground">
            <LayoutGrid className="size-4" aria-hidden /> Explore all categories
          </button>
          <span className="mx-auto flex items-center gap-7">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-foreground/80 hover:text-primary">
                {l.label}
              </a>
            ))}
          </span>
          <a href="/api/docs" className="flex items-center gap-2 text-foreground/80 hover:text-primary">
            <HeartHandshake className="size-4" aria-hidden /> API docs
          </a>
        </nav>
        </div>
      </div>
      {open && (
        <nav className="border-b bg-background px-4 py-2 md:hidden" aria-label="Sections">
          {[...LINKS, ...(me ? [] : [{ href: "/login", label: "Log in" }])].map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center px-2 text-sm font-medium">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
