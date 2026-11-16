import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));
vi.mock("@/server/lib/auth", () => ({
  requireUser: vi.fn(),
  requireRole: vi.fn(),
}));
vi.spyOn(console, "error").mockImplementation(() => {});

import { requireUser } from "@/server/lib/auth";
import { AppError } from "@/server/lib/errors";
import { resetRateLimits } from "@/server/lib/rate-limit";
import { ok, route } from "@/server/lib/route";

const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("route() error mapping", () => {
  beforeEach(() => resetRateLimits());

  it("wraps success in { data }", async () => {
    const res = await route({}, () => ok({ a: 1 }))(new Request("http://x/api"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { a: 1 } });
  });

  it("maps AppError to its status and shape", async () => {
    const res = await route({}, () => {
      throw AppError.notFound("nope");
    })(new Request("http://x/api"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "nope" } });
  });

  it("returns 400 VALIDATION_ERROR with details for bad body", async () => {
    const res = await route({ body: z.object({ n: z.number() }) }, () => ok(1))(post({ n: "x" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details.fieldErrors.n).toBeDefined();
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await route({ body: z.object({}) }, () => ok(1))(post("{nope"));
    expect(res.status).toBe(400);
  });

  it("never leaks internals on unknown errors", async () => {
    const res = await route({}, () => {
      throw new Error("db password is hunter2");
    })(new Request("http://x/api"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
  });

  it("returns 401 when auth guard rejects", async () => {
    vi.mocked(requireUser).mockRejectedValue(AppError.unauthorized());
    const res = await route({ auth: true }, () => ok(1))(new Request("http://x/api"));
    expect(res.status).toBe(401);
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    const h = route({ rateLimit: { name: "t", limit: 1, windowMs: 60_000 } }, () => ok(1));
    await h(new Request("http://x/api"));
    const res = await h(new Request("http://x/api"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
