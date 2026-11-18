import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { nonEmptyPatch, vndSchema } from "@/server/shared/schema";

const fields = {
  name: z.string().trim().min(1).max(100),
  area: z.number().positive().max(100_000),
  floor: z.number().int().min(-5).max(200),
  bathrooms: z.number().int().min(0).max(50),
  bedrooms: z.number().int().min(0).max(50),
  rentPrice: vndSchema,
  rentNegotiable: z.boolean(),
  description: z.string().trim().max(2000),
};

export const unitListQuerySchema = paginationQuerySchema.extend({ q: z.string().trim().min(1).max(100).optional() });
export type IUnitListQuery = z.infer<typeof unitListQuerySchema>;

export const createUnitPayloadSchema = z.object({
  name: fields.name,
  area: fields.area,
  floor: fields.floor,
  bathrooms: fields.bathrooms.optional(),
  bedrooms: fields.bedrooms.optional(),
  rentPrice: fields.rentPrice.optional(),
  rentNegotiable: fields.rentNegotiable.default(false),
  description: fields.description.optional(),
});
export type ICreateUnitPayload = z.infer<typeof createUnitPayloadSchema>;
export interface ICreateUnitCommand extends ICreateUnitPayload, IPropertyScope {}
export const toCreateUnitCommand = (p: ICreateUnitPayload, s: IPropertyScope): ICreateUnitCommand => ({ ...p, ...s });

/** PATCH: omitted = unchanged, null = clear. */
export const updateUnitPayloadSchema = z
  .object({
    name: fields.name,
    area: fields.area,
    floor: fields.floor,
    bathrooms: fields.bathrooms.nullable(),
    bedrooms: fields.bedrooms.nullable(),
    rentPrice: fields.rentPrice.nullable(),
    rentNegotiable: fields.rentNegotiable,
    description: fields.description.nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateUnitPayload = z.infer<typeof updateUnitPayloadSchema>;
export interface IUpdateUnitCommand extends IUpdateUnitPayload, IPropertyScope {
  unitId: string;
}
export const toUpdateUnitCommand = (p: IUpdateUnitPayload, s: IPropertyScope, unitId: string): IUpdateUnitCommand => ({ ...p, ...s, unitId });

export interface IUnitResponse {
  id: string;
  propertyId: string;
  name: string;
  area: number;
  floor: number;
  bathrooms: number | null;
  bedrooms: number | null;
  rentPrice: number | null;
  rentNegotiable: boolean;
  description: string | null;
}
export type IUnitListResponse = IPaginated<IUnitResponse>;
