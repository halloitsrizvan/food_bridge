import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Offline" };

// Precached by the service worker and shown when a page was never saved and there is no connection.
export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <span className="grid size-16 place-items-center rounded-full bg-secondary">
        <WifiOff className="size-8 text-primary" aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-semibold">You are offline</h1>
      <p className="text-muted-foreground">This page has not been saved on your device yet. Pages you have already opened still work offline. Reconnect to see live food posts.</p>
      <Link href="/" className={cn(buttonVariants(), "h-11 rounded-xl px-6")}>
        Try again
      </Link>
    </main>
  );
}
