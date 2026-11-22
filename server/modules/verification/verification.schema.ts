import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import type { IActor } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema } from "@/server/shared/schema";

export const verificationStatusSchema = z.enum(["none", "registered", "verified"]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export const criterionStatusSchema = z.enum(["declared", "confirmed", "rejected"]);
export type CriterionStatus = z.infer<typeof criterionStatusSchema>;

const optionalText = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable();

// ── criteria catalog (platform staff) ───────────────────────────────────────────────
export const createCriterionPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nameEn: optionalText(200).optional(),
  description: optionalText(1000).optional(),
  descriptionEn: optionalText(1000).optional(),
  required: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
export type ICreateCriterionPayload = z.infer<typeof createCriterionPayloadSchema>;

export const updateCriterionPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    nameEn: optionalText(200),
    description: optionalText(1000),
    descriptionEn: optionalText(1000),
    required: z.boolean(),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type IUpdateCriterionPayload = z.infer<typeof updateCriterionPayloadSchema>;
export interface IUpdateCriterionCommand extends IUpdateCriterionPayload {
  actor: IActor;
  criterionId: string;
}

export const criterionParamsSchema = z.object({ criterionId: idSchema });

// ── owner: declare a criterion as met ───────────────────────────────────────────────
export const declarePayloadSchema = z.object({ note: optionalText(1000).optional() });
export type IDeclarePayload = z.infer<typeof declarePayloadSchema>;
export interface IDeclareCommand extends IPropertyScope {
  criterionId: string;
  note: string | null;
}
export interface IWithdrawCommand extends IPropertyScope {
  criterionId: string;
}

// ── staff: review queue ─────────────────────────────────────────────────────────────
export const reviewListQuerySchema = paginationQuerySchema.extend({
  status: criterionStatusSchema.default("declared"),
});
export type IReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const reviewPayloadSchema = z
  .object({
    decision: z.enum(["confirmed", "rejected"]),
    /** how long a confirmation stays valid; required when confirming */
    years: z.union([z.literal(1), z.literal(2)]).optional(),
    reviewNote: optionalText(1000).optional(),
  })
  .refine((v) => v.decision !== "confirmed" || v.years !== undefined, { message: "Choose 1 or 2 years", path: ["years"] })
  .refine((v) => v.decision !== "rejected" || !!v.reviewNote, { message: "Explain why it is rejected", path: ["reviewNote"] });
export type IReviewPayload = z.infer<typeof reviewPayloadSchema>;
export const verificationParamsSchema = z.object({ verificationId: idSchema });
export interface IReviewCommand {
  actor: IActor;
  verificationId: string;
  decision: "confirmed" | "rejected";
  reviewNote: string | null;
  years: 1 | 2 | null;
}

// ── responses ───────────────────────────────────────────────────────────────────────
export interface ICriterionResponse {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  required: boolean;
  active: boolean;
  sortOrder: number;
}
export interface IDeclarationResponse {
  id: string;
  status: CriterionStatus;
  note: string | null;
  reviewNote: string | null;
  declaredAt: string;
  reviewedAt: string | null;
  /** confirmed only */
  validityYears: number | null;
  expiresAt: string | null;
}
/** A criterion with this property's declaration (null = not declared). */
export interface IPropertyCriterionResponse {
  criterion: ICriterionResponse;
  declaration: IDeclarationResponse | null;
}
/** One period during which the property was verified. */
export interface IVerificationResultResponse {
  id: string;
  verifiedAt: string;
  expiresAt: string;
  endedAt: string | null;
  endReason: "expired" | "no_longer_met" | null;
  criteria: { criterionId: string; name: string; nameEn: string | null; years: number; confirmedAt: string; expiresAt: string }[];
}
export interface IPropertyVerificationResponse {
  status: VerificationStatus;
  /** when `verified` lapses (null unless verified) */
  expiresAt: string | null;
  /** every verified period, newest first; the open one (endedAt null) is the current result */
  history: IVerificationResultResponse[];
  criteria: IPropertyCriterionResponse[];
}
export interface IReviewItemResponse extends IDeclarationResponse {
  property: { id: string; name: string; street: string };
  criterion: ICriterionResponse;
}
export type IReviewListResponse = IPaginated<IReviewItemResponse>;
