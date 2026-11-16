import { Quote } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";

/** Split screen: illustration side + form. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-deep p-12 text-white lg:flex lg:flex-col lg:justify-between" style={{ background: "linear-gradient(160deg,#032724,#088178)" }}>
        <div className="bg-dots absolute inset-0 opacity-30" aria-hidden />
        <svg className="absolute -bottom-10 -right-10 size-[420px] opacity-15" viewBox="0 0 200 200" fill="none" aria-hidden>
          <circle cx="100" cy="100" r="92" stroke="white" strokeWidth="2" />
          <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="2" />
          <path d="M60 110c0-26 16-34 16-58M100 100c0-26 16-34 16-58M140 110c0-26 16-34 16-58" stroke="#F2A33A" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <Link href="/" className="relative z-10 text-white">
          <Logo light />
        </Link>
        <div className="relative z-10 max-w-md">
          <Quote className="mb-4 size-8 text-saffron" aria-hidden />
          <p className="font-display text-3xl font-semibold leading-snug">Last night we served 120 plates that would have gone in the bin.</p>
          <p className="mt-4 text-sm text-white/75">Charity kitchen, Kozhikode</p>
        </div>
        <p className="relative z-10 text-xs text-white/60">A government-run food-surplus network. No middlemen, no fees.</p>
      </aside>
      <main id="main" className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block lg:hidden">
            <Logo />
          </Link>
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mb-6 mt-1 text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
