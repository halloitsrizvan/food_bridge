"use client";

import { ArrowUpRight, Landmark, LayoutGrid, Menu, Search, X } from "lucide-react";
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
      <div className={cn("grid transition-[grid-template-rows] duration-300", scrolled ? "grid-rows-[0fr]" : "grid-rows-[1fr]")} inert={scrolled}>
        <div className="min-h-0 overflow-hidden">
          <div className="flex items-center justify-center gap-2 bg-[#032724] px-3 py-1.5 text-[11px] text-white/90 sm:text-xs">
            <Landmark className="size-3.5 shrink-0 text-saffron" aria-hidden />
            <span className="truncate">
              <b className="font-semibold text-white">A Government initiative</b> for public food-surplus management
              <span className="hidden sm:inline"> · Official Government Service</span>
            </span>
          </div>
        </div>
      </div>
      <div className={cn("grid grid-rows-[1fr] transition-[grid-template-rows] duration-300", scrolled && "max-md:grid-rows-[0fr]")}>
        <div className={cn("min-h-0 overflow-hidden", scrolled && "max-md:invisible")}>
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
        </div>
      </div>
      <div className="border-b">
        <div className={cn("mx-auto flex max-w-[1680px] items-center gap-4 px-4 transition-[height] duration-300 sm:px-8", scrolled ? "h-16" : "h-[72px]")}>
          <Link href="/" aria-label="FoodBridge home">
            <Logo />
          </Link>
          <nav className={cn("ml-4 hidden items-center gap-6 text-sm font-medium", scrolled && "xl:flex")} aria-label="Sections" aria-hidden={!scrolled}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} tabIndex={scrolled ? 0 : -1} className="whitespace-nowrap text-foreground/80 hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
          <form
            role="search"
            className={cn("relative hidden min-w-0 transition-all duration-300 md:block", scrolled ? "ml-auto w-48 lg:w-60" : "mx-auto max-w-xl flex-1")}
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
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5 md:ml-0">
            <ThemeToggle />
            {!me && (
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden h-10 px-4 sm:inline-flex")}>
                Log in
              </Link>
            )}
            <Link href={cta.href} className={cn(buttonVariants(), "h-10 gap-1.5 pl-4 pr-1.5 text-[13px] sm:pl-5 sm:pr-2 sm:text-sm")}>
              {cta.label}
              <span className="grid size-6 place-items-center rounded-full bg-background text-primary">
                <ArrowUpRight className="size-3.5" aria-hidden />
              </span>
            </Link>
            <button type="button" className={cn("grid size-11 place-items-center rounded-full hover:bg-muted", scrolled ? "xl:hidden" : "md:hidden")} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      <div className={cn("hidden grid-rows-[1fr] transition-[grid-template-rows] duration-300 md:grid", scrolled && "grid-rows-[0fr]")} inert={scrolled}>
        <div className="min-h-0 overflow-hidden border-b">
        <nav className="mx-auto flex h-12 max-w-[1680px] items-center gap-6 px-4 text-sm font-medium sm:px-8" aria-label="Page sections">
          <button type="button" onClick={() => setFeedFilter({})} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-foreground">
            <LayoutGrid className="size-4" aria-hidden /> Explore all categories
          </button>
          <span className="mx-auto flex items-center gap-4 lg:gap-7">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-foreground/80 hover:text-primary">
                {l.label}
              </a>
            ))}
          </span>
        </nav>
        </div>
      </div>
      {open && (
        <div id="mobile-menu" className={cn("max-h-[calc(100dvh-7rem)] overflow-y-auto border-b bg-background px-4 pb-4 pt-3 shadow-lift", scrolled ? "xl:hidden" : "md:hidden")}>
          <form
            role="search"
            className="relative mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              setFeedFilter({ q });
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              aria-label="Search food"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search biryani, sadhya, bread..."
              className="h-12 w-full rounded-full border bg-secondary pl-11 pr-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:bg-background"
            />
          </form>
          <nav aria-label="Sections" className="grid">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFeedFilter({});
              }}
              className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-left text-[15px] font-medium hover:bg-muted"
            >
              <LayoutGrid className="size-4 text-primary" aria-hidden /> Explore all categories
            </button>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-2 text-[15px] font-medium hover:bg-muted">
                {l.label}
              </a>
            ))}
          </nav>
          {!me && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
                Log in
              </Link>
              <Link href="/signup" className={cn(buttonVariants(), "h-11")}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
