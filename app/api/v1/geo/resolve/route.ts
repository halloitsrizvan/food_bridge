import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { resolveMapsUrl } from "@/server/services/geo.service";

// Turns a pasted (short) Google Maps link into coordinates. Signed-in users only; host allowlist inside.
export const POST = route(
  { auth: true, body: z.object({ url: z.url().max(600) }), rateLimit: { name: "geo-resolve", limit: 20, windowMs: 60_000 } },
  async ({ body }) => ok(await resolveMapsUrl(body.url)),
);
