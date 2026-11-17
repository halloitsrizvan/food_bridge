"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang, useT } from "@/lib/i18n";
import { Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Source = { kind: "knowledge" | "offer" | "need" | "stats"; label: string; href?: string };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

export function FoodBridgeChat() {
  const pathname = usePathname();
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  // The greeting follows the language until the user has sent a message.
  const [messages, setMessages] = useState<Message[]>([]);
  const shown: Message[] = messages.length ? messages : [{ role: "assistant", content: t.chat.welcome }];
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Small "Chat with AI" bubble above the icon: once per browser session, landing page only.
  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem("fb:chat-hint")) return;
    } catch {}
    const id = setTimeout(() => setHint(true), 1500);
    return () => clearTimeout(id);
  }, [pathname]);

  function dismissHint() {
    setHint(false);
    try {
      sessionStorage.setItem("fb:chat-hint", "1");
    } catch {}
  }

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(content: string) {
    const clean = content.trim();
    if (!clean || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: clean }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12), lang }),
      });
      const result = (await response.json()) as { data?: { message?: string; sources?: Source[] }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to reach the assistant");
      setMessages((current) => [...current, { role: "assistant", content: result.data?.message ?? "I couldn’t create a response.", sources: result.data?.sources }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : t.chat.unavailable },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label={t.chat.title}
          className="mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl sm:w-[390px]"
        >
          <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="grid size-10 place-items-center rounded-2xl bg-white/15"><Bot className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.chat.title}</p>
              <p className="flex items-center gap-1 text-xs text-primary-foreground/75"><Sparkles className="size-3" /> {t.chat.powered}</p>
            </div>
            <Button aria-label={t.chat.close} size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15 hover:text-white" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/25 p-4" aria-live="polite">
            {shown.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-background text-foreground shadow-sm")}>
                  {message.content}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2.5 border-t pt-2">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t.chat.sources}</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {message.sources.map((s) => (
                          <li key={s.label}>
                            {s.href ? (
                              <a href={s.href} className="inline-block max-w-full truncate rounded-full bg-secondary px-2.5 py-1 text-[11px] text-foreground hover:bg-accent">
                                {s.label}
                              </a>
                            ) : (
                              <span className="inline-block max-w-full truncate rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">{s.label}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {t.chat.suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> {t.chat.thinking}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="flex items-end gap-2 border-t bg-background p-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(event);
                }
              }}
              placeholder={t.chat.placeholder}
              aria-label={t.chat.title}
              rows={1}
              maxLength={2_000}
              disabled={loading}
              className="max-h-28 min-h-10 resize-none"
            />
            <Button type="submit" size="icon-lg" disabled={!input.trim() || loading} aria-label={t.chat.send}><Send /></Button>
          </form>
        </section>
      )}

      {hint && !open && (
        <div className="absolute bottom-full right-0 mb-3 flex w-max items-center gap-1 rounded-2xl bg-background py-2 pl-4 pr-2 text-sm font-medium shadow-lift ring-1 ring-border animate-in fade-in slide-in-from-bottom-2">
          <button type="button" onClick={() => { dismissHint(); setOpen(true); }} className="font-semibold text-primary">
            {t.chat.hint}
          </button>
          <button type="button" aria-label={t.chat.dismiss} onClick={dismissHint} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-3.5" />
          </button>
          <span className="absolute -bottom-1.5 right-6 size-3 rotate-45 bg-background ring-1 ring-border [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden />
        </div>
      )}
      <Button
        size="icon-lg"
        className="ml-auto size-14 rounded-full shadow-lg transition-transform hover:scale-105"
        aria-label={open ? t.chat.close : t.chat.open}
        aria-expanded={open}
        onClick={() => {
          dismissHint();
          setOpen((current) => !current);
        }}
      >
        {open ? <X className="size-6" /> : <Bot className="size-7" />}
      </Button>
    </div>
  );
}
