import type { Metadata, Viewport } from "next";
import { DM_Sans, Bricolage_Grotesque, Geist_Mono, Atkinson_Hyperlegible, Noto_Sans_Malayalam, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { PwaRegister } from "@/components/layout/pwa-register";
import { BOOT_SCRIPT } from "@/lib/boot-scripts";
import { FoodBridgeChat } from "@/components/chat/foodbridge-chat";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap", axes: ["opsz", "wdth"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Script fonts for the language switch (Malayalam / Hindi): fetched only when those languages are shown.
const notoMl = Noto_Sans_Malayalam({ variable: "--font-noto-ml", subsets: ["malayalam"], display: "swap", preload: false });
const notoHi = Noto_Sans_Devanagari({ variable: "--font-noto-hi", subsets: ["devanagari"], display: "swap", preload: false });
// Only downloaded when a user picks the "Easy to read" font (preload off).
const readable = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "FoodBridge: surplus food finds a plate", template: "%s | FoodBridge" },
  description: "A government-run network matching surplus food with people who need it, before it spoils.",
  applicationName: "FoodBridge",
  appleWebApp: { capable: true, title: "FoodBridge", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#061A18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${bricolage.variable} ${mono.variable} ${readable.variable} ${notoMl.variable} ${notoHi.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <FoodBridgeChat />
        <PwaRegister />
      </body>
    </html>
  );
}
