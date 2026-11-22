import { z } from "zod";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import type { IUnitResponse } from "../unit/unit.schema";
import { referenceAddressLinksSchema, type IPropertyReferenceAddressResponse } from "../reference-address/reference-address.schema";
import type { VerificationStatus } from "../verification/verification.schema";
import { propertyCategorySchema, vndSchema, type PropertyCategory, type PropertyRole, type ServiceUsageBase } from "@/server/shared/schema";

// ── address JSON (snapshot of the external provinces/wards API) ─────────────────────
export const provinceSchema = z.object({
  code: z.number().int().positive(),
  name: z.string().trim().min(1),
  codename: z.string().trim().min(1),
});
export const wardSchema = provinceSchema.extend({ provinceCode: z.number().int().positive() });
export type IProvince = z.infer<typeof provinceSchema>;
export type IWard = z.infer<typeof wardSchema>;

const storageKey = z.string().trim().min(1).max(500);
const priceRange = (v: { rentPriceFrom?: number | null; rentPriceTo?: number | null }) =>
  v.rentPriceFrom == null || v.rentPriceTo == null || v.rentPriceFrom <= v.rentPriceTo;

// ── GET /api/public/properties ──────────────────────────────────────────────────────
export const propertySearchQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().trim().min(1).max(100).optional(),
    provinceCode: z.coerce.number().int().positive().optional(),
    wardCode: z.coerce.number().int().positive().optional(),
    category: propertyCategorySchema.optional(),
    /** slug of a reference address: properties near it, nearest first */
    referenceAddress: z.string().trim().min(1).max(200).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "minPrice must be <= maxPrice",
    path: ["maxPrice"],
  });
export type IPropertySearchQuery = z.infer<typeof propertySearchQuerySchema>;

// ── GET /api/admin/properties ───────────────────────────────────────────────────────
export const adminPropertyListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});
export type IAdminPropertyListQuery = z.infer<typeof adminPropertyListQuerySchema>;

// ── POST /api/admin/properties ──────────────────────────────────────────────────────
export const createPropertyPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: propertyCategorySchema,
    street: z.string().trim().min(1).max(300),
    province: provinceSchema,
    ward: wardSchema,
    rentPriceFrom: vndSchema.optional(),
    rentPriceTo: vndSchema.optional(),
    rentNegotiable: z.boolean().default(false),
    headerImage: storageKey.optional(),
    images: z.array(storageKey).max(50).default([]),
    rules: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
    referenceAddresses: referenceAddressLinksSchema.default([]),
  })
  .refine((v) => v.ward.provinceCode === v.province.code, { message: "Ward does not belong to the province", path: ["ward"] })
  .refine(priceRange, { message: "rentPriceFrom must be <= rentPriceTo", path: ["rentPriceTo"] });
export type ICreatePropertyPayload = z.infer<typeof createPropertyPayloadSchema>;

export interface ICreatePropertyCommand extends ICreatePropertyPayload {
  actor: IActor;
}
export const toCreatePropertyCommand = (payload: ICreatePropertyPayload, actor: IActor): ICreatePropertyCommand => ({
  ...payload,
  actor,
});

// ── PATCH /api/admin/properties/:propertyId  (setup: images, header image, rules, address ...) ──
// omitted = unchanged, null = clear. Province and ward travel together.
export const updatePropertyPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    category: propertyCategorySchema,
    street: z.string().trim().min(1).max(300),
    province: provinceSchema,
    ward: wardSchema,
    rentPriceFrom: vndSchema.nullable(),
    rentPriceTo: vndSchema.nullable(),
    rentNegotiable: z.boolean(),
    headerImage: storageKey.nullable(),
    images: z.array(storageKey).max(50),
    rules: z.array(z.string().trim().min(1).max(500)).max(100),
    /** replaces the whole set */
    referenceAddresses: referenceAddressLinksSchema,
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update")
  .refine((v) => (v.province === undefined) === (v.ward === undefined), { message: "Send province and ward together", path: ["ward"] })
  .refine((v) => !v.province || !v.ward || v.ward.provinceCode === v.province.code, { message: "Ward does not belong to the province", path: ["ward"] })
  .refine(priceRange, { message: "rentPriceFrom must be <= rentPriceTo", path: ["rentPriceTo"] });
export type IUpdatePropertyPayload = z.infer<typeof updatePropertyPayloadSchema>;
export interface IUpdatePropertyCommand extends IUpdatePropertyPayload, IPropertyScope {}
export const toUpdatePropertyCommand = (p: IUpdatePropertyPayload, s: IPropertyScope): IUpdatePropertyCommand => ({ ...p, ...s });

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IPropertySummaryResponse {
  id: string;
  name: string;
  category: PropertyCategory;
  street: string;
  province: IProvince;
  ward: IWard;
  rentPriceFrom: number | null;
  rentPriceTo: number | null;
  rentNegotiable: boolean;
  headerImage: string | null;
  unitCount: number;
  /** `verified` drops to `registered` once its term has lapsed */
  verificationStatus: VerificationStatus;
  verificationExpiresAt: string | null;
  referenceAddresses: IPropertyReferenceAddressResponse[];
}

/** Public detail: what a prospective tenant may see. */
export interface IPropertyDetailResponse extends IPropertySummaryResponse {
  images: string[];
  rules: string[];
  units: IUnitResponse[];
}

/** Public property page: detail + live availability, house items and services with their current price. */
export interface IPublicPropertyDetail extends IPropertyDetailResponse {
  /** units with no lease running today */
  emptyUnitCount: number;
  /** ids of those units */
  emptyUnitIds: string[];
  /** names of the items provided with a unit (inventory) */
  inventoryItems: string[];
  services: IPublicServiceResponse[];
}
export interface IPublicServiceResponse {
  name: string;
  usageBase: ServiceUsageBase;
  unitOfMeasure: string | null;
  description: string | null;
  /** tiers of the price version in force today; empty when none is effective yet */
  tiers: { upTo: number | null; rate: number }[];
}

/** Admin detail: public detail + management data. */
export interface IAdminPropertyDetail extends IPropertyDetailResponse {
  documents: unknown[];
}
export interface IAdminPropertyResponse extends IAdminPropertyDetail {
  role: PropertyRole;
}
export interface IAdminPropertySummaryResponse extends IPropertySummaryResponse {
  role: PropertyRole;
}

export type IPropertySearchResponse = IPaginated<IPropertySummaryResponse>;
export type IAdminPropertyListResponse = IPaginated<IAdminPropertySummaryResponse>;
