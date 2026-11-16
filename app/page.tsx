import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-semibold">App</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Your product name</h1>
        <p className="max-w-md text-muted-foreground">
          Placeholder landing page. Replace this with the pitch.
        </p>
        <div className="flex gap-3">
          <Link href="/signup" className={cn(buttonVariants())}>
            Get started
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
            Log in
          </Link>
          <Link href="/api/docs" className={cn(buttonVariants({ variant: "ghost" }))}>
            API docs
          </Link>
        </div>
      </main>
    </div>
  );
}
