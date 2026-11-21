import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env itself.
try { process.loadEnvFile(".env"); } catch { /* no .env (e.g. CI / Docker): use real env vars */ }

// Migrations need a DIRECT (or session-mode) Postgres connection: Supabase's transaction pooler (port 6543)
// can't run DDL reliably. Runtime queries use DATABASE_URL (pooled) — see server/infrastructure/prisma/client.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nhazi",
  },
});
