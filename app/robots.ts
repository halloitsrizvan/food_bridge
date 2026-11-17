import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Public pages are crawlable; signed-in areas, the API and one-off pages are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/gov", "/onboarding", "/api/", "/offline", "/verify/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
