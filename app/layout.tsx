import type { Metadata, Viewport } from "next";
import { DM_Sans, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { FoodBridgeChat } from "@/components/chat/foodbridge-chat";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap", axes: ["opsz", "wdth"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FoodBridge: surplus food finds a plate", template: "%s | FoodBridge" },
  description: "A government-run network matching surplus food with people who need it, before it spoils.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#061A18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${bricolage.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <FoodBridgeChat />
      </body>
    </html>
  );
}
