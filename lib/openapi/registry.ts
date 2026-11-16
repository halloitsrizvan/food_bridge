// Single OpenAPI registry. Each feature registers its paths in lib/openapi/<feature>.ts,
// then is imported in lib/openapi/index.ts. See docs/ADD_A_FEATURE.md.
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema, successSchema } from "@/lib/schemas/common";
import type { z } from "zod";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "supabaseSession", {
  type: "apiKey",
  in: "cookie",
  name: "sb-<project>-auth-token",
  description: "Supabase session cookie, set after logging in through the app.",
});

export const errorResponses = {
  400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
  401: { description: "Not authenticated", content: { "application/json": { schema: ErrorResponseSchema } } },
  403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
  429: { description: "Rate limited", content: { "application/json": { schema: ErrorResponseSchema } } },
  500: { description: "Server error", content: { "application/json": { schema: ErrorResponseSchema } } },
} as const;

/** Helper: JSON success response wrapped in { data }. */
export const okResponse = (description: string, data: z.ZodType) => ({
  description,
  content: { "application/json": { schema: successSchema(data) } },
});
