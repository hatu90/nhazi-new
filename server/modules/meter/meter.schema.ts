import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { idSchema, isoDateSchema, nonEmptyPatch } from "@/server/shared/schema";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";

export const meterListQuerySchema = paginationQuerySchema.extend({
  unitId: idSchema.optional(),
  serviceId: idSchema.optional(),
  inService: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
export type IMeterListQuery = z.infer<typeof meterListQuerySchema>;

const fields = {
  name: z.string().trim().min(1).max(100),
  serialNumber: z.string().trim().min(1).max(100),
  installedAt: isoDateSchema,
  removedAt: isoDateSchema,
  maxValue: z.number().positive().max(99_999_999_999),
  description: z.string().trim().max(1000),
};

export const createMeterPayloadSchema = z.object({
  unitId: idSchema,
  serviceId: idSchema,
  name: fields.name,
  serialNumber: fields.serialNumber.optional(),
  installedAt: fields.installedAt.optional(),
  maxValue: fields.maxValue.optional(),
  description: fields.description.optional(),
});
export type ICreateMeterPayload = z.infer<typeof createMeterPayloadSchema>;
export interface ICreateMeterCommand extends ICreateMeterPayload, IPropertyScope {}
export const toCreateMeterCommand = (p: ICreateMeterPayload, s: IPropertyScope): ICreateMeterCommand => ({ ...p, ...s });

export const updateMeterPayloadSchema = z
  .object({
    name: fields.name,
    serialNumber: fields.serialNumber.nullable(),
    installedAt: fields.installedAt.nullable(),
    removedAt: fields.removedAt.nullable(),
    maxValue: fields.maxValue.nullable(),
    description: fields.description.nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateMeterPayload = z.infer<typeof updateMeterPayloadSchema>;
export interface IUpdateMeterCommand extends IUpdateMeterPayload, IPropertyScope {
  meterId: string;
}
export const toUpdateMeterCommand = (p: IUpdateMeterPayload, s: IPropertyScope, meterId: string): IUpdateMeterCommand => ({ ...p, ...s, meterId });

export interface IMeterResponse {
  id: string;
  propertyId: string;
  unitId: string;
  unitName: string;
  serviceId: string;
  serviceName: string;
  name: string;
  serialNumber: string | null;
  installedAt: string | null;
  removedAt: string | null;
  maxValue: number | null;
  description: string | null;
}
export type IMeterListResponse = IPaginated<IMeterResponse>;
