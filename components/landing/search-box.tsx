"use client";

import { Clock, Search, TrendingUp } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useOffers } from "@/lib/api/hooks";
import { fmt, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Item = { text: string; kind: "popular" | "live" | "match" };

/**
 * Search field with a suggestion dropdown: popular searches and what is on the live feed right now,
 * narrowed as you type. Arrow keys move, Enter picks, Escape closes.
 */
export function SearchBox({
  value,
  onChange,
  onSubmit,
  inputClassName,
  iconClassName,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called on Enter / picking a suggestion; the caller scrolls to the feed. */
  onSubmit: (v: string) => void;
  inputClassName?: string;
  iconClassName?: string;
  className?: string;
}) {
  const t = useT();
  const id = useId();
  const wrap = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { data } = useOffers({ sort: "soonest", limit: 30 });

  // Titles from the live feed, de-duplicated (case-insensitive).
  const liveTitles = useMemo(() => {
    const seen = new Set<string>();
    return (data?.items ?? []).map((o) => o.title.trim()).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  }, [data]);

  const q = value.trim().toLowerCase();
  const sections = useMemo(() => {
    const popular = t.nav.suggestions;
    if (!q) {
      return [
        { title: t.nav.popular, icon: TrendingUp, items: popular.slice(0, 6).map((text): Item => ({ text, kind: "popular" })) },
        ...(liveTitles.length ? [{ title: t.nav.availableNow, icon: Clock, items: liveTitles.slice(0, 4).map((text): Item => ({ text, kind: "live" })) }] : []),
      ];
    }
    const live = liveTitles.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 5);
    const pop = popular.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 3);
    return [
      ...(live.length ? [{ title: t.nav.availableNow, icon: Clock, items: live.map((text): Item => ({ text, kind: "live" })) }] : []),
      ...(pop.length ? [{ title: t.nav.popular, icon: TrendingUp, items: pop.map((text): Item => ({ text, kind: "popular" })) }] : []),
    ];
  }, [q, liveTitles, t]);

  const flat = sections.flatMap((s) => s.items);
  // With text typed, the first row is always "search for ...", so Enter keeps its normal meaning.
  const showDropdown = open && (flat.length > 0 || q.length > 0);

  function pick(text: string) {
    onChange(text);
    setOpen(false);
    setActive(-1);
    onSubmit(text);
  }

  return (
    <form
      ref={wrap}
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && flat[active]) return pick(flat[active].text);
        setOpen(false);
        onSubmit(value);
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search className={cn("pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground", iconClassName)} aria-hidden />
      <input
        role="combobox"
        aria-label={t.nav.searchLabel}
        aria-expanded={showDropdown}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (flat.length ? (i + 1) % flat.length : -1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (flat.length ? (i <= 0 ? flat.length - 1 : i - 1) : -1));
          } else if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
        }}
        placeholder={t.nav.searchPlaceholder}
        className={inputClassName}
      />

      {showDropdown && (
        <div id={`${id}-list`} role="listbox" aria-label={t.nav.searchLabel} className="absolute inset-x-0 top-full z-50 mt-2 max-h-[22rem] overflow-y-auto rounded-2xl border bg-background p-2 shadow-lift">
          {q && (
            <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(value.trim())} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">
              <Search className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 truncate">{fmt(t.nav.searchFor, { q: value.trim() })}</span>
            </button>
          )}
          {sections.map((s) => (
            <div key={s.title} className="mt-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
              {s.items.map((it) => {
                const idx = flat.indexOf(it);
                const Icon = s.icon;
                return (
                  <button
                    key={`${it.kind}-${it.text}`}
                    id={`${id}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={idx === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => pick(it.text)}
                    className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm", idx === active ? "bg-muted" : "hover:bg-muted")}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 truncate">{it.text}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
