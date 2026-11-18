import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { isoDateSchema, nonEmptyPatch, serviceUsageBaseSchema, vndSchema, type ServiceUsageBase } from "@/server/shared/schema";

/** One price version: tiers over usage, `upTo: null` = unbounded last tier. Embedded in `services.prices`. */
export const priceVersionSchema = z
  .object({
    effectiveDate: isoDateSchema,
    tiers: z.array(z.object({ upTo: z.number().positive().nullable(), rate: vndSchema })).min(1).max(20),
  })
  .refine(
    (v) =>
      v.tiers.every((t, i) => (i === v.tiers.length - 1 ? t.upTo === null : t.upTo !== null && (i === 0 || t.upTo > v.tiers[i - 1].upTo!))),
    { message: "Tiers must ascend by upTo and only the last tier is unbounded (upTo: null)", path: ["tiers"] },
  );
export type IPriceVersion = z.infer<typeof priceVersionSchema>;
export const pricesSchema = z.array(priceVersionSchema).min(1).refine(
  (v) => v.every((x, i) => i === 0 || x.effectiveDate > v[i - 1].effectiveDate),
  "effectiveDate must be strictly ascending",
);

/** lease / device services are flat: exactly one tier per version. */
export const tiersFitUsageBase = (base: ServiceUsageBase, versions: IPriceVersion[]) =>
  base === "meter" || base === "member" || versions.every((v) => v.tiers.length === 1);

export const serviceListQuerySchema = paginationQuerySchema.extend({ usageBase: serviceUsageBaseSchema.optional() });
export type IServiceListQuery = z.infer<typeof serviceListQuerySchema>;

export const createServicePayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    usageBase: serviceUsageBaseSchema,
    unitOfMeasure: z.string().trim().min(1).max(30).optional(),
    description: z.string().trim().max(1000).optional(),
    prices: pricesSchema,
  })
  .refine((v) => tiersFitUsageBase(v.usageBase, v.prices), { message: "This usage base takes a single flat tier", path: ["prices"] });
export type ICreateServicePayload = z.infer<typeof createServicePayloadSchema>;
export interface ICreateServiceCommand extends ICreateServicePayload, IPropertyScope {}
export const toCreateServiceCommand = (p: ICreateServicePayload, s: IPropertyScope): ICreateServiceCommand => ({ ...p, ...s });

export const updateServicePayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    unitOfMeasure: z.string().trim().min(1).max(30).nullable(),
    description: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateServicePayload = z.infer<typeof updateServicePayloadSchema>;
export interface IUpdateServiceCommand extends IUpdateServicePayload, IPropertyScope {
  serviceId: string;
}
export const toUpdateServiceCommand = (p: IUpdateServicePayload, s: IPropertyScope, serviceId: string): IUpdateServiceCommand => ({ ...p, ...s, serviceId });

/** POST .../prices : append a version that takes effect later than every existing one. */
export const addPricePayloadSchema = priceVersionSchema;
export type IAddPricePayload = z.infer<typeof addPricePayloadSchema>;
export interface IAddPriceCommand extends IPropertyScope {
  serviceId: string;
  version: IAddPricePayload;
}
export const toAddPriceCommand = (p: IAddPricePayload, s: IPropertyScope, serviceId: string): IAddPriceCommand => ({ ...s, serviceId, version: p });

export interface IServiceResponse {
  id: string;
  propertyId: string;
  name: string;
  usageBase: ServiceUsageBase;
  unitOfMeasure: string | null;
  description: string | null;
  prices: IPriceVersion[];
}
export type IServiceListResponse = IPaginated<IServiceResponse>;

