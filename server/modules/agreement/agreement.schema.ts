import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { nonEmptyPatch } from "@/server/shared/schema";

/** Puck editor data. Stored as-is; only the top-level shape is checked. */
export const puckDataSchema = z.looseObject({ content: z.array(z.any()), root: z.any().optional(), zones: z.any().optional() });
export type IPuckData = z.infer<typeof puckDataSchema>;

/** One entry of `agreement_templates.versions` (append-only). */
export const templateVersionSchema = z.object({
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  createdBy: z.uuid(),
  data: puckDataSchema,
});
export const templateVersionsSchema = z.array(templateVersionSchema).min(1);
export type ITemplateVersion = z.infer<typeof templateVersionSchema>;

export const templateListQuerySchema = paginationQuerySchema;
export type ITemplateListQuery = z.infer<typeof templateListQuerySchema>;

export const createTemplatePayloadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  data: puckDataSchema,
  isDefault: z.boolean().default(false),
});
export type ICreateTemplatePayload = z.infer<typeof createTemplatePayloadSchema>;
export interface ICreateTemplateCommand extends ICreateTemplatePayload, IPropertyScope {}
export const toCreateTemplateCommand = (p: ICreateTemplatePayload, s: IPropertyScope): ICreateTemplateCommand => ({ ...p, ...s });

export const updateTemplatePayloadSchema = z
  .object({ name: z.string().trim().min(1).max(100), isDefault: z.boolean() })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateTemplatePayload = z.infer<typeof updateTemplatePayloadSchema>;
export interface IUpdateTemplateCommand extends IUpdateTemplatePayload, IPropertyScope {
  templateId: string;
}
export const toUpdateTemplateCommand = (p: IUpdateTemplatePayload, s: IPropertyScope, templateId: string): IUpdateTemplateCommand => ({ ...p, ...s, templateId });

/** `baseVersion` = the version the editor loaded; saving on top of a newer one is a conflict. */
export const addVersionPayloadSchema = z.object({ baseVersion: z.number().int().positive(), data: puckDataSchema });
export type IAddVersionPayload = z.infer<typeof addVersionPayloadSchema>;
export interface IAddVersionCommand extends IAddVersionPayload, IPropertyScope {
  templateId: string;
}
export const toAddVersionCommand = (p: IAddVersionPayload, s: IPropertyScope, templateId: string): IAddVersionCommand => ({ ...p, ...s, templateId });

export interface ITemplateSummaryResponse {
  id: string;
  propertyId: string;
  name: string;
  isDefault: boolean;
  currentVersion: number;
  updatedAt: string;
}
export interface ITemplateDetailResponse extends ITemplateSummaryResponse {
  versions: { version: number; createdAt: string; createdBy: string }[];
  currentData: IPuckData;
}
export interface ITemplateVersionResponse {
  templateId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  data: IPuckData;
}
export type ITemplateListResponse = IPaginated<ITemplateSummaryResponse>;
