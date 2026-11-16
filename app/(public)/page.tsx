import { LocationBootstrap } from "@/components/landing/location-bootstrap";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/nav";
import { LiveFeed } from "@/components/landing/live-feed";
import { CtaBand, ExpiringDeals, ExploreCategories, Faq, Footer, HowItWorks, PromoBanners } from "@/components/landing/sections";

export default function Home() {
  return (
    <>
      <LocationBootstrap />
      <LandingNav />
      <main id="main">
        <Hero />
        <ExploreCategories />
        <LiveFeed />
        <PromoBanners />
        <ExpiringDeals />
        <HowItWorks />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
