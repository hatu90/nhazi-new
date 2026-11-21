import { z } from "zod";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema } from "@/server/shared/schema";

/** "Khu công nghiệp Yên Phong" -> "khu-cong-nghiep-yen-phong" (lowercase, no diacritics, hyphen-separated). */
export const slugify = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((v) => slugify(v).length > 0, "Name needs at least one letter or digit");

/** Meters from the property to the reference address. */
export const distanceSchema = z.number().int().nonnegative().max(1_000_000);

// ── GET /api/public/reference-addresses?q= ──────────────────────────────────────────
export const referenceAddressSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
export type IReferenceAddressSearchQuery = z.infer<typeof referenceAddressSearchQuerySchema>;

// ── POST /api/admin/reference-addresses  (find-or-create by slug) ───────────────────
export const createReferenceAddressPayloadSchema = z.object({ name: nameSchema });
export type ICreateReferenceAddressPayload = z.infer<typeof createReferenceAddressPayloadSchema>;

/**
 * How a property points at a reference address: an existing one (`id`) or a new one (`name`, found-or-created by slug),
 * plus the distance in meters.
 */
export const referenceAddressLinkSchema = z
  .object({
    id: idSchema.optional(),
    name: nameSchema.optional(),
    distance: distanceSchema.nullable().optional(),
  })
  .refine((v) => (v.id === undefined) !== (v.name === undefined), { message: "Send either id or name", path: ["name"] });
export type IReferenceAddressLink = z.infer<typeof referenceAddressLinkSchema>;
export const referenceAddressLinksSchema = z.array(referenceAddressLinkSchema).max(20);

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IReferenceAddressResponse {
  id: string;
  name: string;
  slug: string;
}
/** A reference address as attached to a property. */
export interface IPropertyReferenceAddressResponse extends IReferenceAddressResponse {
  distance: number | null;
}
export type IReferenceAddressListResponse = IPaginated<IReferenceAddressResponse>;
