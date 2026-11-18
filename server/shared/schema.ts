import { z } from "zod";

/** Reusable zod building blocks. Schemas validate AND normalise (trim, E.164, ...). */
export const idSchema = z.uuid();
export const idParamsSchema = <K extends string>(...keys: K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, idSchema])) as Record<K, typeof idSchema>);
export const nonEmptyPatch = (v: object) => Object.values(v).some((x) => x !== undefined);

/** Whole VND. */
export const vndSchema = z.number().int().nonnegative().max(99_999_999_999_999);

/** Vietnamese-friendly phone input -> E.164 (0912345678 | 84912345678 | +84 912 345 678 -> +84912345678). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .transform((v) => (v.startsWith("+") ? v : v.startsWith("0") ? `+84${v.slice(1)}` : v.startsWith("84") ? `+${v}` : v))
  .pipe(z.string().regex(/^\+\d{8,15}$/, "Invalid phone number"));

export const isoDateSchema = z.iso.date();

export const propertyCategorySchema = z.enum(["apartment", "house", "mini_apartment", "office"]);
export type PropertyCategory = z.infer<typeof propertyCategorySchema>;

export const propertyRoleSchema = z.enum(["owner", "admin", "technician", "viewer"]);
export type PropertyRole = z.infer<typeof propertyRoleSchema>;

export const invitationKindSchema = z.enum(["property", "lease"]);
export type InvitationKind = z.infer<typeof invitationKindSchema>;

export const invitationStatusSchema = z.enum(["pending", "accepted", "declined", "revoked"]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const invoiceStatusSchema = z.enum(["pending", "partial", "paid", "cancelled"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceKindSchema = z.enum(["move_in", "transition", "closing", "other"]);
export type InvoiceKind = z.infer<typeof invoiceKindSchema>;

export const accountStatusSchema = z.enum(["active", "inactive", "suspended"]);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const serviceUsageBaseSchema = z.enum(["meter", "lease", "device", "member"]);
export type ServiceUsageBase = z.infer<typeof serviceUsageBaseSchema>;

export const itemConditionSchema = z.enum(["good", "damaged", "missing"]);
export type ItemCondition = z.infer<typeof itemConditionSchema>;
