import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodBridge: surplus food finds a plate",
    short_name: "FoodBridge",
    description: "A government-run network matching surplus food with people who need it, before it spoils.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#066a62",
    categories: ["food", "lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Log in", url: "/login", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
