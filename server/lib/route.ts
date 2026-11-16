// route(): the one wrapper every route handler uses.
// auth -> rate limit -> validate body/query -> handler -> { data } | { error }
import type { Profile } from "@prisma/client";
import { connection, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@/lib/schemas/profile";
import { requireRole, requireUser } from "./auth";
import { AppError } from "./errors";
import { clientIp, rateLimit } from "./rate-limit";

type Opts<B extends z.ZodType | undefined, Q extends z.ZodType | undefined> = {
  /** true = any signed-in user; Role[] = those roles only; omitted = public. */
  auth?: true | Role[];
  body?: B;
  query?: Q;
  /** Per-instance limiter, keyed by name + user id (or IP when public). */
  rateLimit?: { name: string; limit: number; windowMs: number };
};

type Ctx<B, Q> = {
  req: Request;
  user: Profile | null;
  body: B extends z.ZodType ? z.infer<B> : undefined;
  query: Q extends z.ZodType ? z.infer<Q> : undefined;
  params: Record<string, string>;
};

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    const headers: Record<string, string> = {};
    if (e.code === "RATE_LIMITED") {
      const d = e.details as { retryAfterSec?: number } | undefined;
      if (d?.retryAfterSec) headers["Retry-After"] = String(d.retryAfterSec);
    }
    return NextResponse.json(
      { error: { code: e.code, message: e.message, ...(e.details !== undefined && { details: e.details }) } },
      { status: e.status, headers },
    );
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request", details: z.flattenError(e) } },
      { status: 400 },
    );
  }
  // Unknown: full detail goes to server logs only.
  console.error("[route] unhandled error", e);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Internal server error" } }, { status: 500 });
}

export function route<
  B extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
>(opts: Opts<B, Q>, handler: (ctx: Ctx<B, Q>) => Promise<Response> | Response) {
  return async (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    await connection(); // API handlers always run at request time (never prerendered)
    try {
      let user: Profile | null = null;
      if (opts.auth === true) user = await requireUser();
      else if (Array.isArray(opts.auth)) user = await requireRole(...opts.auth);

      if (opts.rateLimit) {
        const { name, limit, windowMs } = opts.rateLimit;
        rateLimit(`${name}:${user?.id ?? clientIp(req)}`, limit, windowMs);
      }

      let body: unknown;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw AppError.badRequest("Request body must be valid JSON");
        }
        body = opts.body.parse(raw);
      }
      const query = opts.query
        ? opts.query.parse(Object.fromEntries(new URL(req.url).searchParams))
        : undefined;
      const params = (await routeCtx?.params) ?? {};

      return await handler({ req, user, body, query, params } as Ctx<B, Q>);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
