import { z } from "zod";

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: "ErrorResponse" });

/** Wrap a payload schema in the standard success envelope: { data }. */
export const successSchema = <T extends z.ZodType>(data: T) => z.object({ data });

export type ApiError = z.infer<typeof ErrorResponseSchema>["error"];
