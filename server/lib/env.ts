import { AppError } from "./errors";

/** Read a required server env var. Logs the exact name server-side, never leaks it to clients. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[env] Missing required environment variable: ${name}`);
    throw new AppError(500, "INTERNAL", "Server is not configured");
  }
  return value;
}
