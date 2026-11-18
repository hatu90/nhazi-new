import { z } from "zod";

export const BULK_MAX = 200;

/** `{ items: [...] }`, 1..200 entries; names must be unique inside the batch (the database also enforces it per property). */
export const bulkSchema = <T extends z.ZodType>(item: T, nameOf?: (v: z.infer<T>) => string) =>
  z
    .object({ items: z.array(item).min(1).max(BULK_MAX) })
    .superRefine((v, ctx) => {
      if (!nameOf) return;
      const seen = new Set<string>();
      v.items.forEach((it, i) => {
        const key = nameOf(it).trim().toLowerCase();
        if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["items", i, "name"], message: "Duplicate name in the request" });
        seen.add(key);
      });
    });
