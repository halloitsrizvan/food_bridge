import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
// Register every feature here (one import per file):
import "./system";

export function generateOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "API", version: "1.0.0", description: "Generated from Zod schemas." },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL ?? "/" }],
  });
}
