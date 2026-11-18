import { z } from "zod";
import { bulkSchema } from "@/server/shared/bulk";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { itemConditionSchema, nonEmptyPatch, type ItemCondition } from "@/server/shared/schema";

// ── property inventory (catalogue of items) ─────────────────────────────────────────
export const itemListQuerySchema = paginationQuerySchema.extend({ q: z.string().trim().min(1).max(100).optional() });
export type IItemListQuery = z.infer<typeof itemListQuerySchema>;

export const itemPayloadSchema = z.object({ name: z.string().trim().min(1).max(100) });
export type IItemPayload = z.infer<typeof itemPayloadSchema>;
export interface ICreateItemCommand extends IItemPayload, IPropertyScope {}
export interface IUpdateItemCommand extends IItemPayload, IPropertyScope {
  itemId: string;
}
export const bulkItemsPayloadSchema = bulkSchema(itemPayloadSchema, (v) => v.name);
export type IBulkItemsPayload = z.infer<typeof bulkItemsPayloadSchema>;
export interface IBulkItemsCommand extends IPropertyScope {
  items: IItemPayload[];
}
export const toBulkItemsCommand = (p: IBulkItemsPayload, s: IPropertyScope): IBulkItemsCommand => ({ ...p, ...s });
export const toCreateItemCommand = (p: IItemPayload, s: IPropertyScope): ICreateItemCommand => ({ ...p, ...s });
export const toUpdateItemCommand = (p: IItemPayload, s: IPropertyScope, itemId: string): IUpdateItemCommand => ({ ...p, ...s, itemId });

export interface IItemResponse {
  id: string;
  propertyId: string;
  name: string;
}
export type IItemListResponse = IPaginated<IItemResponse>;

// ── default handover list of a unit ────────────────────────────────────────────────
export const createHandoverPayloadSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().min(1).max(1000),
  condition: itemConditionSchema.default("good"),
  description: z.string().trim().max(1000).optional(),
});
export type ICreateHandoverPayload = z.infer<typeof createHandoverPayloadSchema>;
export interface ICreateHandoverCommand extends ICreateHandoverPayload, IPropertyScope {
  unitId: string;
}
export const toCreateHandoverCommand = (p: ICreateHandoverPayload, s: IPropertyScope, unitId: string): ICreateHandoverCommand => ({ ...p, ...s, unitId });

export const updateHandoverPayloadSchema = z
  .object({
    quantity: z.number().int().min(1).max(1000),
    condition: itemConditionSchema,
    description: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateHandoverPayload = z.infer<typeof updateHandoverPayloadSchema>;
export interface IUpdateHandoverCommand extends IUpdateHandoverPayload, IPropertyScope {
  unitId: string;
  handoverId: string;
}
export const toUpdateHandoverCommand = (p: IUpdateHandoverPayload, s: IPropertyScope, unitId: string, handoverId: string): IUpdateHandoverCommand => ({
  ...p,
  ...s,
  unitId,
  handoverId,
});

export interface IHandoverResponse {
  id: string;
  unitId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  condition: ItemCondition;
  description: string | null;
}
