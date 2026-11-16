import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
// Register every feature here (one import per file):
import "./foodbridge";

export function generateOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "FoodBridge API", version: "1.0.0", description: "Government-run food surplus matching. Responses are { data } or { error: { code, message } }." },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? "/" }],
  });
}
