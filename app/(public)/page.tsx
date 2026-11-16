import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/nav";
import { LiveFeed } from "@/components/landing/live-feed";
import { Faq, Footer, HowItWorks, ImpactSection, TrustStrip } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <LiveFeed />
        <HowItWorks />
        <TrustStrip />
        <ImpactSection />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
