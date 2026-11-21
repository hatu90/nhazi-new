import { z } from "zod";
import type { ICost, IPriceVersion } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, isoDateSchema, vndSchema, type ServiceUsageBase } from "@/server/shared/schema";

export const billingPeriodListQuerySchema = paginationQuerySchema.extend({
  leaseId: idSchema.optional(),
  status: z.enum(["active", "closed"]).optional(),
});
export type IBillingPeriodListQuery = z.infer<typeof billingPeriodListQuerySchema>;

// ── POST .../leases/:leaseId/billing-periods : open the next period ───────────────────
// The start is never typed in: first period = lease start, then the day after the previous period.
// `rentAmount` is the admin's final number (the frontend pre-fills it, e.g. prorated); omitted = the lease's full rent.
export const openPeriodPayloadSchema = z.object({ endDate: isoDateSchema, rentAmount: vndSchema.optional() });
export type IOpenPeriodPayload = z.infer<typeof openPeriodPayloadSchema>;
export interface IOpenPeriodCommand extends IOpenPeriodPayload, IPropertyScope {
  leaseId: string;
}
export const toOpenPeriodCommand = (p: IOpenPeriodPayload, s: IPropertyScope, leaseId: string): IOpenPeriodCommand => ({ ...p, ...s, leaseId });

// ── PATCH .../billing-periods/:periodId/usages/:usageId : adjust a counted quantity (not meters) ──
export const updateUsagePayloadSchema = z.object({ quantity: z.number().min(0).max(999_999_999) });
export type IUpdateUsagePayload = z.infer<typeof updateUsagePayloadSchema>;
export interface IUpdateUsageCommand extends IUpdateUsagePayload, IPropertyScope {
  periodId: string;
  usageId: string;
}
export const toUpdateUsageCommand = (p: IUpdateUsagePayload, s: IPropertyScope, periodId: string, usageId: string): IUpdateUsageCommand => ({ ...p, ...s, periodId, usageId });

export interface IPeriodScope extends IPropertyScope {
  periodId: string;
}

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IBillingPeriodResponse {
  id: string;
  leaseId: string;
  unitName: string;
  status: "active" | "closed";
  startDate: string;
  endDate: string;
  rentAmount: number;
}
export interface IReadingRef {
  id: string;
  readOn: string;
  value: number;
}
export interface IUsageRecord {
  id: string;
  subscriptionId: string;
  serviceName: string;
  usageBase: ServiceUsageBase;
  /** The subscribed meter (meter usages only). */
  meterId: string | null;
  /** meter: closing - opening (null until the period closes); others: the counted quantity */
  quantity: number | null;
  /** The price version frozen when the period opened. */
  price: IPriceVersion;
  openingReading: IReadingRef | null;
  closingReading: IReadingRef | null;
  /** On an invoice already (not voided). */
  billed: boolean;
}
export interface IUsageResponse extends Omit<IUsageRecord, "billed"> {
  billed: boolean;
  /** Calculated from quantity × frozen price; null while the quantity is unknown. The invoice amount may differ (negotiation). */
  cost: ICost | null;
}
export interface IBillingPeriodDetailRecord extends IBillingPeriodResponse {
  usages: IUsageRecord[];
}
export interface IBillingPeriodDetailResponse extends IBillingPeriodResponse {
  usages: IUsageResponse[];
}
export type IBillingPeriodListResponse = IPaginated<IBillingPeriodResponse>;
