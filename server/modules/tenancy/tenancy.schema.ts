import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, isoDateSchema, itemConditionSchema, nonEmptyPatch, phoneSchema, vndSchema, type ItemCondition, type ServiceUsageBase } from "@/server/shared/schema";
import type { IRentVersion, LeaseStatus } from "../lease/lease.schema";

const thisYear = new Date().getFullYear();
const yearOfBirth = z.number().int().min(1900).max(thisYear);
const money = vndSchema;

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
    /** Where the first billing period ends (it starts on startDate). Prefilled by the frontend, e.g. the end of that month. */
    firstPeriodEnd: isoDateSchema,
    billingCycleDay: z.number().int().min(1).max(28).default(1),
    depositAmount: money.default(0),
    /** Accounts that can log in and see the lease. Unregistered phones get a placeholder account they claim on sign-up. */
    tenants: z.array(z.object({ phoneNumber: phoneSchema, displayName: z.string().trim().min(1).max(100) })).min(1).max(10),
    members: z
      .array(z.object({ name: z.string().trim().min(1).max(100), phoneNumber: phoneSchema.optional(), yearOfBirth }))
      .max(20)
      .default([]),
    agreement: z.object({ templateId: idSchema, values: z.record(z.string(), z.unknown()).default({}) }).optional(),
    documents: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: "endDate must be on/after startDate", path: ["endDate"] })
  .refine((v) => v.firstPeriodEnd >= v.startDate && (!v.endDate || v.firstPeriodEnd <= v.endDate), {
    message: "firstPeriodEnd must be within the lease",
    path: ["firstPeriodEnd"],
  });
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
    documents: z.array(z.string().trim().min(1).max(500)).max(50),
    agreementValues: z.record(z.string(), z.unknown()),
  })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateLeasePayload = z.infer<typeof updateLeasePayloadSchema>;
export interface IUpdateLeaseCommand extends IUpdateLeasePayload, IPropertyScope {
  leaseId: string;
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

// ── lease handover (condition at move-in / move-out) ───────────────────────────────
export const updateLeaseHandoverPayloadSchema = z
  .object({ condition: itemConditionSchema, quantity: z.number().int().min(0).max(1000), description: z.string().trim().max(1000).nullable() })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateLeaseHandoverPayload = z.infer<typeof updateLeaseHandoverPayloadSchema>;
export interface IUpdateLeaseHandoverCommand extends IUpdateLeaseHandoverPayload, IPropertyScope {
  leaseId: string;
  handoverId: string;
}
export const toUpdateLeaseHandoverCommand = (p: IUpdateLeaseHandoverPayload, s: IPropertyScope, leaseId: string, handoverId: string): IUpdateLeaseHandoverCommand => ({
  ...p,
  ...s,
  leaseId,
  handoverId,
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
  agreement: { templateId: string; templateName: string; version: number; values: unknown } | null;
  documents: string[];
  members: { id: string; name: string; phoneNumber: string | null; yearOfBirth: number; joinedAt: string; leftAt: string | null }[];
  handovers: { id: string; itemName: string; quantity: number; condition: ItemCondition; description: string | null }[];
  subscriptions: ISubscriptionResponse[];
}
export type ITenancyListResponse = IPaginated<ITenancySummaryResponse>;
export type ITenancySummaryRecord = Omit<ITenancySummaryResponse, "status" | "currentRent"> & { rentVersions: IRentVersion[] };
export type ITenancyDetailRecord = Omit<ITenancyDetailResponse, "status" | "currentRent">;
