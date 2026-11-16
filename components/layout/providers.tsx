"use client";

import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/lib/api/query-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryProvider>
        {children}
        <Toaster richColors />
      </QueryProvider>
    </ThemeProvider>
  );
}
