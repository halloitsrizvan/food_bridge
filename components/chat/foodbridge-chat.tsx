"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const welcome: Message = {
  role: "assistant",
  content: "Hi! I’m the FoodBridge assistant. Ask me how to donate food, request a meal, complete a handover, or use the platform safely.",
};

const suggestions = ["How do I donate food?", "How does the OTP handover work?", "What food is safe to share?"];

export function FoodBridgeChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
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
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      const result = (await response.json()) as { data?: { message?: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to reach the assistant");
      setMessages((current) => [...current, { role: "assistant", content: result.data?.message ?? "I couldn’t create a response." }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "The assistant is temporarily unavailable." },
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
          aria-label="FoodBridge AI assistant"
          className="mb-3 flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl sm:w-[390px]"
        >
          <header className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="grid size-10 place-items-center rounded-2xl bg-white/15"><Bot className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">FoodBridge Assistant</p>
              <p className="flex items-center gap-1 text-xs text-primary-foreground/75"><Sparkles className="size-3" /> Powered by Groq AI</p>
            </div>
            <Button aria-label="Close assistant" size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/15 hover:text-white" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/25 p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-background text-foreground shadow-sm")}>
                  {message.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Thinking…</div>}
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
              placeholder="Ask about FoodBridge…"
              aria-label="Message the FoodBridge assistant"
              rows={1}
              maxLength={2_000}
              disabled={loading}
              className="max-h-28 min-h-10 resize-none"
            />
            <Button type="submit" size="icon-lg" disabled={!input.trim() || loading} aria-label="Send message"><Send /></Button>
          </form>
        </section>
      )}

      {hint && !open && (
        <div className="absolute bottom-full right-0 mb-3 flex w-max items-center gap-1 rounded-2xl bg-background py-2 pl-4 pr-2 text-sm font-medium shadow-lift ring-1 ring-border animate-in fade-in slide-in-from-bottom-2">
          <button type="button" onClick={() => { dismissHint(); setOpen(true); }} className="font-semibold text-primary">
            Chat with AI
          </button>
          <button type="button" aria-label="Dismiss" onClick={dismissHint} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-3.5" />
          </button>
          <span className="absolute -bottom-1.5 right-6 size-3 rotate-45 bg-background ring-1 ring-border [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden />
        </div>
      )}
      <Button
        size="icon-lg"
        className="ml-auto size-14 rounded-full shadow-lg transition-transform hover:scale-105"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
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
