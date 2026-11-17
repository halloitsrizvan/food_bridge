"use client";

import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGS, useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Compact language menu for headers: English / മലയാളം / हिन्दी. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const current = LANGS.find((l) => l.code === lang)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className={cn("h-10 gap-1.5 px-2.5", className)} aria-label={t.common.language} />}>
        <Languages className="size-5" aria-hidden />
        <span className="hidden text-sm font-medium sm:inline">{current.native}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="justify-between gap-2">
            <span>
              {l.native} <span className="text-xs text-muted-foreground">{l.code !== "en" && l.english}</span>
            </span>
            {lang === l.code && <Check className="size-4 text-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
