import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

// DB-backed integration tests read DATABASE_URL from .env.local when present; they skip otherwise.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local: integration tests skip */
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 180_000, hookTimeout: 60_000 },
});
