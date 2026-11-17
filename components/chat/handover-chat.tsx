"use client";

import { ArrowLeft, Check, CheckCheck, MessageSquare, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/shared/badges";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { STATUS_LABEL, STATUS_STYLE } from "@/components/claims/claim-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatInbox, useChatThread, useSendMessage } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** All conversations: one per handover, newest activity first. */
export function ChatInboxPage() {
  const t = useT();
  const { data, isPending, isError, error, refetch } = useChatInbox();
  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t.msgs.title}</h1>
        <p className="text-muted-foreground">{t.msgs.sub}</p>
      </div>
      {data.threads.length === 0 ? (
        <EmptyState art="search" title={t.msgs.empty} description={t.msgs.emptySub} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-[20px] border bg-surface shadow-soft">
          {data.threads.map((th) => (
            <li key={th.claimId}>
              <Link href={`/dashboard/chats/${th.claimId}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60">
                <Avatar name={th.otherName} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate font-semibold", th.unread > 0 && "text-primary")}>{th.otherName}</p>
                    <span className="text-xs text-muted-foreground">· {th.otherRole === "GIVER" ? t.msgs.forTaker : t.msgs.forGiver}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(th.lastAt)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{th.offerTitle}</p>
                  <p className={cn("truncate text-sm", th.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {th.lastMessage ? `${th.lastMine ? `${t.msgs.you}: ` : ""}${th.lastMessage}` : t.msgs.noMessages}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {th.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-clay px-1.5 text-[11px] font-bold leading-5 text-white">{th.unread > 9 ? "9+" : th.unread}</span>}
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_STYLE[th.claimStatus])}>{STATUS_LABEL[th.claimStatus]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One handover's conversation. Polls every 3 seconds; opening it marks the other side's messages read. */
export function ChatThreadPage({ claimId }: { claimId: string }) {
  const t = useT();
  const { lang } = useLang();
  const { data, isPending, isError, error, refetch } = useChatThread(claimId);
  const send = useSendMessage(claimId);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow new messages only while the reader is at the bottom
  const count = data?.messages.length ?? 0;

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [count]);

  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message || t.msgs.loadFail} onRetry={() => refetch()} />;

  const locale = lang === "ml" ? "ml-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || send.isPending) return;
    send.mutate(body, {
      onSuccess: () => {
        setText("");
        stick.current = true;
      },
      onError: (err) => toast.error(err.message || t.msgs.sendFail),
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-3xl flex-col overflow-hidden rounded-[20px] border bg-surface shadow-soft md:h-[calc(100dvh-8.5rem)]">
      <header className="flex items-center gap-3 border-b px-3 py-3 sm:px-4">
        <Link href="/dashboard/chats" aria-label={t.msgs.back} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar name={data.otherName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{data.otherName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {data.otherRole === "GIVER" ? t.msgs.forTaker : t.msgs.forGiver} · {data.offerTitle}
          </p>
        </div>
        <span className={cn("hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline", STATUS_STYLE[data.claimStatus])}>{STATUS_LABEL[data.claimStatus]}</span>
        <Link href={`/dashboard/claims/${claimId}`} className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted">
          {t.msgs.viewHandover}
        </Link>
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-1.5 overflow-y-auto bg-muted/25 px-3 py-4 sm:px-4"
        aria-live="polite"
      >
        {data.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-xs space-y-2">
              <MessageSquare className="mx-auto size-10 text-primary/60" aria-hidden />
              <p className="font-medium">{t.msgs.noMessages}</p>
              <p className="text-sm text-muted-foreground">{t.msgs.startHint}</p>
            </div>
          </div>
        ) : (
          data.messages.map((m, i) => {
            const prev = data.messages[i - 1];
            const newDay = !prev || day(prev.createdAt) !== day(m.createdAt);
            return (
              <div key={m.id}>
                {newDay && <p className="my-3 text-center text-[11px] font-medium text-muted-foreground">{day(m.createdAt)}</p>}
                <div className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed", m.mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-background shadow-sm")}>
                    {m.body}
                    <span className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", m.mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {time(m.createdAt)}
                      {m.mine && (m.read ? <CheckCheck className="size-3.5" aria-label={t.msgs.seen} /> : <Check className="size-3.5" aria-label={t.msgs.sent} />)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {data.writable ? (
        <form onSubmit={submit} className="border-t bg-background p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldAlert className="size-3.5 shrink-0 text-saffron" aria-hidden /> {t.msgs.otpWarn}
          </p>
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={t.msgs.placeholder}
              aria-label={t.msgs.placeholder}
              rows={1}
              maxLength={1000}
              className="max-h-28 min-h-10 resize-none"
            />
            <Button type="submit" size="icon-lg" disabled={!text.trim() || send.isPending} aria-label={t.msgs.send}>
              <Send />
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t bg-background p-4 text-center text-sm text-muted-foreground">{t.msgs.closed}</p>
      )}
    </div>
  );
}
