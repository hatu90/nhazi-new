import { Prisma } from "./client";
import { ConflictError } from "@/server/shared/errors";

type DecimalLike = { toNumber(): number };

/** Money (numeric(14,0)) and quantities -> JS number. Whole VND fits safely in a double. */
export const num = (d: DecimalLike) => d.toNumber();
export const numOrNull = (d: DecimalLike | null) => (d === null ? null : d.toNumber());
/** `date` column -> "YYYY-MM-DD". */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const isoDateOrNull = (d: Date | null) => (d === null ? null : isoDate(d));
export const isoDateTime = (d: Date) => d.toISOString();

export const isUniqueViolation = (err: unknown): boolean =>
  (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
  // EXCLUDE constraints (no-overlap rules) surface without a dedicated Prisma code
  (err instanceof Error && /exclusion constraint|conflicting key value/i.test(err.message));

/** Run a write; translate a unique violation into a domain ConflictError. */
export async function orConflict<T>(run: () => Promise<T>, message: string, code: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError(message, code);
    throw err;
  }
}

/** Validated-by-zod values are plain JSON; this just satisfies Prisma's JSON input type at the boundary. */
export const toJson = (v: unknown) => v as Prisma.InputJsonValue;

/** `leases.documents` (JSON) → `{ path, name }[]`; tolerates malformed rows. */
export const toDocuments = (v: unknown): { path: string; name: string }[] =>
  Array.isArray(v)
    ? v.flatMap((d) => (d && typeof d === "object" && typeof (d as { path?: unknown }).path === "string" ? [{ path: (d as { path: string }).path, name: typeof (d as { name?: unknown }).name === "string" ? (d as { name: string }).name : "" }] : []))
    : [];
