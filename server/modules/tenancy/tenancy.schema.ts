import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, isoDateSchema, nonEmptyPatch, phoneSchema, vndSchema, type ItemCondition, type ServiceUsageBase } from "@/server/shared/schema";
import type { ILeaseDocument, IRentVersion, LeaseStatus } from "../lease/lease.schema";
import { createHandoverPayloadSchema } from "../inventory/inventory.schema";

const thisYear = new Date().getFullYear();
const yearOfBirth = z.number().int().min(1900).max(thisYear);
const money = vndSchema;
export const leaseDocumentSchema = z.object({ path: z.string().trim().min(1).max(500), name: z.string().trim().max(200).default("") });

// ── list ────────────────────────────────────────────────────────────────────────────
export const tenancyListQuerySchema = paginationQuerySchema.extend({
  unitId: idSchema.optional(),
  status: z.enum(["draft", "upcoming", "active", "ended"]).optional(),
});
export type ITenancyListQuery = z.infer<typeof tenancyListQuerySchema>;

// ── POST leases ─────────────────────────────────────────────────────────────────────
export const createLeasePayloadSchema = z
  .object({
    unitId: idSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
    rent: money,
    depositAmount: money.default(0),
    /** Each phone gets a lease invitation (and sees the lease once it accepts). The deposit invoice is issued with the draft. */
    tenants: z.array(z.object({ phoneNumber: phoneSchema, displayName: z.string().trim().min(1).max(100) })).max(10).default([]),
    members: z
      .array(z.object({ name: z.string().trim().min(1).max(100), phoneNumber: phoneSchema.optional(), yearOfBirth }))
      .max(20)
      .default([]),
    /** Optionally start the lease with one agreement; more can be added later. */
    agreement: z.object({ templateId: idSchema, values: z.record(z.string(), z.unknown()).default({}) }).optional(),
    documents: z.array(leaseDocumentSchema).max(50).default([]),
    /** Inventory items handed over with the lease. More can be added later via /handovers. */
    handovers: z.array(createHandoverPayloadSchema).max(200).default([]),
  })
  .refine((v) => new Set(v.handovers.map((h) => h.itemId)).size === v.handovers.length, { message: "Each item can only be listed once", path: ["handovers"] })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: "endDate must be on/after startDate", path: ["endDate"] });
export type ICreateLeasePayload = z.infer<typeof createLeasePayloadSchema>;
export interface ICreateLeaseCommand extends ICreateLeasePayload, IPropertyScope {}
export const toCreateLeaseCommand = (p: ICreateLeasePayload, s: IPropertyScope): ICreateLeaseCommand => ({ ...p, ...s });

// ── PATCH lease ─────────────────────────────────────────────────────────────────────
export const updateLeasePayloadSchema = z
  .object({
    endDate: isoDateSchema.nullable(),
    billingCycleDay: z.number().int().min(1).max(28),
    /** Draft only. */
    depositAmount: money,
    /** Draft only. */
    firstPeriodEnd: isoDateSchema,
    documents: z.array(leaseDocumentSchema).max(50),
    /** Fill in one agreement's form fields. */
    agreementValues: z.object({ agreementId: idSchema, values: z.record(z.string(), z.unknown()) }),
    /** Add an agreement from this template (its current version is pinned). */
    addAgreement: idSchema,
    /** Remove an agreement (by its id on the lease). */
    removeAgreement: idSchema,
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateLeasePayload = z.infer<typeof updateLeasePayloadSchema>;
export interface IUpdateLeaseCommand extends IUpdateLeasePayload, IPropertyScope {
  leaseId: string;
  /** Set by the use case from `addAgreement`. */
  newAgreement?: { id: string; templateId: string; version: number };
}
export const toUpdateLeaseCommand = (p: IUpdateLeasePayload, s: IPropertyScope, leaseId: string): IUpdateLeaseCommand => ({ ...p, ...s, leaseId });

// ── POST terminate / rent ───────────────────────────────────────────────────────────
export const terminateLeasePayloadSchema = z.object({ terminatedAt: isoDateSchema, reason: z.string().trim().max(1000).optional() });
export type ITerminateLeasePayload = z.infer<typeof terminateLeasePayloadSchema>;
export interface ITerminateLeaseCommand extends ITerminateLeasePayload, IPropertyScope {
  leaseId: string;
}
export const toTerminateLeaseCommand = (p: ITerminateLeasePayload, s: IPropertyScope, leaseId: string): ITerminateLeaseCommand => ({ ...p, ...s, leaseId });

export const addRentPayloadSchema = z.object({ effectiveDate: isoDateSchema, amount: money });
export type IAddRentPayload = z.infer<typeof addRentPayloadSchema>;
export interface IAddRentCommand extends IAddRentPayload, IPropertyScope {
  leaseId: string;
}
export const toAddRentCommand = (p: IAddRentPayload, s: IPropertyScope, leaseId: string): IAddRentCommand => ({ ...p, ...s, leaseId });

// ── tenants ─────────────────────────────────────────────────────────────────────────
export const addTenantPayloadSchema = z.object({ phoneNumber: phoneSchema, displayName: z.string().trim().min(1).max(100) });
export type IAddTenantPayload = z.infer<typeof addTenantPayloadSchema>;
export interface IAddTenantCommand extends IAddTenantPayload, IPropertyScope {
  leaseId: string;
}
export const toAddTenantCommand = (p: IAddTenantPayload, s: IPropertyScope, leaseId: string): IAddTenantCommand => ({ ...p, ...s, leaseId });

// ── members (people living in the unit; drive member-based services) ───────────────
export const addLeaseMemberPayloadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phoneNumber: phoneSchema.optional(),
  yearOfBirth,
  joinedAt: isoDateSchema.optional(),
});
export type IAddLeaseMemberPayload = z.infer<typeof addLeaseMemberPayloadSchema>;
export interface IAddLeaseMemberCommand extends IAddLeaseMemberPayload, IPropertyScope {
  leaseId: string;
}
export const toAddLeaseMemberCommand = (p: IAddLeaseMemberPayload, s: IPropertyScope, leaseId: string): IAddLeaseMemberCommand => ({ ...p, ...s, leaseId });

export const updateLeaseMemberPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phoneNumber: phoneSchema.nullable(),
    leftAt: isoDateSchema.nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateLeaseMemberPayload = z.infer<typeof updateLeaseMemberPayloadSchema>;
export interface IUpdateLeaseMemberCommand extends IUpdateLeaseMemberPayload, IPropertyScope {
  leaseId: string;
  memberId: string;
}
export const toUpdateLeaseMemberCommand = (p: IUpdateLeaseMemberPayload, s: IPropertyScope, leaseId: string, memberId: string): IUpdateLeaseMemberCommand => ({
  ...p,
  ...s,
  leaseId,
  memberId,
});

// ── subscriptions ───────────────────────────────────────────────────────────────────
export const subscriptionFields = {
  serviceId: idSchema,
  meterId: idSchema.optional(),
  quantity: z.number().int().min(1).max(100).default(1),
  details: z.string().trim().max(500).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
};
export const createSubscriptionPayloadSchema = z
  .object(subscriptionFields)
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: "endDate must be on/after startDate", path: ["endDate"] });
export type ICreateSubscriptionPayload = z.infer<typeof createSubscriptionPayloadSchema>;
export interface ICreateSubscriptionCommand extends ICreateSubscriptionPayload, IPropertyScope {
  leaseId: string;
}
export const toCreateSubscriptionCommand = (p: ICreateSubscriptionPayload, s: IPropertyScope, leaseId: string): ICreateSubscriptionCommand => ({ ...p, ...s, leaseId });

export const updateSubscriptionPayloadSchema = z
  .object({ endDate: isoDateSchema.nullable(), quantity: z.number().int().min(1).max(100), details: z.string().trim().max(500).nullable() })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateSubscriptionPayload = z.infer<typeof updateSubscriptionPayloadSchema>;
export interface IUpdateSubscriptionCommand extends IUpdateSubscriptionPayload, IPropertyScope {
  leaseId: string;
  subscriptionId: string;
}
export const toUpdateSubscriptionCommand = (p: IUpdateSubscriptionPayload, s: IPropertyScope, leaseId: string, subscriptionId: string): IUpdateSubscriptionCommand => ({
  ...p,
  ...s,
  leaseId,
  subscriptionId,
});

// ── responses ───────────────────────────────────────────────────────────────────────
export interface ITenantResponse {
  accountId: string;
  displayName: string;
  phoneNumber: string;
}
export interface ITenancySummaryResponse {
  id: string;
  unitId: string;
  unitName: string;
  startDate: string;
  endDate: string | null;
  terminatedAt: string | null;
  /** null = draft */
  activatedAt: string | null;
  status: LeaseStatus;
  currentRent: number | null;
  depositAmount: number;
  tenants: ITenantResponse[];
  /** phone numbers invited to the lease who have not accepted yet */
  pendingInvites: string[];
  /** people currently living in the unit */
  members: { id: string; name: string; phoneNumber: string | null }[];
}
export interface ISubscriptionResponse {
  id: string;
  serviceId: string;
  serviceName: string;
  usageBase: ServiceUsageBase;
  meterId: string | null;
  meterName: string | null;
  quantity: number;
  details: string | null;
  startDate: string;
  endDate: string | null;
}
export interface ITenancyDetailResponse extends ITenancySummaryResponse {
  firstPeriodEnd: string | null;
  billingCycleDay: number;
  terminationReason: string | null;
  rentVersions: IRentVersion[];
  agreements: { id: string; templateId: string; templateName: string; version: number; values: unknown }[];
  documents: ILeaseDocument[];
  members: { id: string; name: string; phoneNumber: string | null; yearOfBirth: number; joinedAt: string; leftAt: string | null }[];
  handovers: { id: string; itemId: string; itemName: string; quantity: number; condition: ItemCondition; description: string | null; returnedQuantity: number | null; returnedCondition: ItemCondition | null; returnNote: string | null }[];
  subscriptions: ISubscriptionResponse[];
}
export type ITenancyListResponse = IPaginated<ITenancySummaryResponse>;
export type ITenancySummaryRecord = Omit<ITenancySummaryResponse, "status" | "currentRent"> & { rentVersions: IRentVersion[] };
export type ITenancyDetailRecord = Omit<ITenancyDetailResponse, "status" | "currentRent">;
