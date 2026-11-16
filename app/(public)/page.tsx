import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/nav";
import { LiveFeed } from "@/components/landing/live-feed";
import { CtaBand, ExpiringDeals, ExploreCategories, Faq, Footer, HowItWorks, PromoBanners, TrustStrip } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <ExploreCategories />
        <LiveFeed />
        <PromoBanners />
        <ExpiringDeals />
        <HowItWorks />
        <TrustStrip />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
