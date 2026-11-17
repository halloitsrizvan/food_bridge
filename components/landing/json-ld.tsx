import { en } from "@/lib/i18n/en";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

/** Organization, WebSite and FAQ structured data (English FAQ) for rich search results. */
export function LandingJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        description: SITE_DESCRIPTION,
        areaServed: { "@type": "City", name: "Kozhikode" },
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: ["en", "ml", "hi"], publisher: { "@id": `${SITE_URL}/#organization` } },
      {
        "@type": "FAQPage",
        mainEntity: en.faq.items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
  // "<" is escaped so no FAQ text can ever close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
