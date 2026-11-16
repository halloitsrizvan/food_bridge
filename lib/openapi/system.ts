import { HealthSchema } from "@/lib/schemas/health";
import { ProfileSchema } from "@/lib/schemas/profile";
import { SignUploadBodySchema, SignUploadResponseSchema } from "@/lib/schemas/upload";
import { errorResponses, okResponse, registry } from "./registry";

registry.registerPath({
  method: "get",
  path: "/api/v1/health",
  tags: ["System"],
  summary: "Health check (verifies DB connectivity)",
  responses: { 200: okResponse("Healthy", HealthSchema), 503: errorResponses[500] },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  tags: ["Auth"],
  summary: "Current user profile",
  security: [{ supabaseSession: [] }],
  responses: { 200: okResponse("Profile", ProfileSchema), 401: errorResponses[401], 429: errorResponses[429] },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/uploads/sign",
  tags: ["Uploads"],
  summary: "Get a signed Cloudinary direct-upload payload",
  security: [{ supabaseSession: [] }],
  request: { body: { content: { "application/json": { schema: SignUploadBodySchema } } } },
  responses: {
    200: okResponse("Signed upload params", SignUploadResponseSchema),
    400: errorResponses[400],
    401: errorResponses[401],
    429: errorResponses[429],
  },
});
