import { z } from "zod";
import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { idSchema, isoDateSchema, vndSchema, type InvoiceKind } from "@/server/shared/schema";
import type { IBillingPeriodDetailResponse } from "../billing/billing.schema";
import type { IAdminInvoiceDetailResponse, IUsageDetail } from "../invoice/invoice.schema";
import { invoiceItemKindSchema } from "../invoice/invoice.schema";
import type { IRefundResponse } from "../refund/refund.schema";
import { paymentMethodSchema } from "../invoice/invoice.schema";
import { subscriptionFields, type ISubscriptionResponse } from "../tenancy/tenancy.schema";

/**
 * The lifecycle actions are single, atomic steps made of several smaller ones. Every amount they create is a
 * PREFILLED SUGGESTION from the shared calculator (lib/billing): `overrides` replaces a suggested line by its key,
 * `extraItems` adds lines. Keys are listed in the response `lines` and in the 422 for an unknown key:
 *   deposit · rent · service:<subscriptionId> · meter:<subscriptionId> · credit:rent · credit:service:<subscriptionId>
 *   refund:rent · refund:service:<subscriptionId> · refund:deposit
 */
export const overridesSchema = z.record(z.string().min(1).max(100), vndSchema).default({});
export const extraItemsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(200),
      kind: invoiceItemKindSchema.default("other"),
      amount: z.number().int().min(-99_999_999_999_999).max(99_999_999_999_999),
    }),
  )
  .max(50)
  .default([]);
export type IExtraItem = z.infer<typeof extraItemsSchema>[number];

/** Meter values read on the boundary date (period start when starting, day after the end when closing). */
export const readingsSchema = z
  .array(z.object({ meterId: idSchema, value: z.number().min(0).max(999_999_999_999) }))
  .max(100)
  .default([]);
export type IReadingInput = z.infer<typeof readingsSchema>[number] & { readAt?: string };
/** Start: a typed reading may carry the moment it was taken (default: the start of the day), so it can follow readings already stored. */
export const startReadingsSchema = z
  .array(z.object({ meterId: idSchema, value: z.number().min(0).max(999_999_999_999), readAt: z.string().datetime().optional() }))
  .max(100)
  .default([]);

const invoiceFields = {
  dueDate: isoDateSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  overrides: overridesSchema,
  extraItems: extraItemsSchema,
};

const signRule = (v: { extraItems: IExtraItem[] }, ctx: z.RefinementCtx) =>
  v.extraItems.forEach((it, i) => {
    if ((it.kind === "credit") !== it.amount < 0 && it.amount !== 0) {
      ctx.addIssue({ code: "custom", path: ["extraItems", i, "amount"], message: "Only credit lines are negative (and credit lines must be negative)" });
    }
  });

// ── POST .../leases/:leaseId/start ─────────────────────────────────────────────────
export const startLeasePayloadSchema = z
  .object({
    /** Move the lease's start (and what begins with it: first rent, services, members) while it is still a draft. Defaults to the lease's start. */
    startDate: isoDateSchema.optional(),
    /** Defaults to the draft's firstPeriodEnd. */
    periodEnd: isoDateSchema.optional(),
    readings: startReadingsSchema,
    ...invoiceFields,
  })
  .superRefine(signRule);
export type IStartLeasePayload = z.infer<typeof startLeasePayloadSchema>;
export interface IStartLeaseCommand extends IStartLeasePayload, IPropertyScope {
  leaseId: string;
}
export const toStartLeaseCommand = (p: IStartLeasePayload, s: IPropertyScope, leaseId: string): IStartLeaseCommand => ({ ...p, ...s, leaseId });

// ── POST .../billing-periods/:periodId/close ───────────────────────────────────────
export const closePeriodPayloadSchema = z
  .object({
    /** Mid-term close: the last day of the period when it is not the planned one. */
    endDate: isoDateSchema.optional(),
    readings: readingsSchema,
    /** Roll over into the next period (and issue the transition invoice). Omit for a plain close. */
    next: z.object({ endDate: isoDateSchema }).optional(),
    ...invoiceFields,
  })
  .superRefine(signRule)
  .superRefine((v, ctx) => {
    if (!v.next && (v.dueDate || v.title || Object.keys(v.overrides).length || v.extraItems.length)) {
      ctx.addIssue({ code: "custom", path: ["next"], message: "Invoice fields need `next`: only a roll-over issues an invoice" });
    }
  });
export type IClosePeriodPayload = z.infer<typeof closePeriodPayloadSchema>;
export interface IClosePeriodCommand extends IClosePeriodPayload, IPropertyScope {
  periodId: string;
}
export const toClosePeriodCommand = (p: IClosePeriodPayload, s: IPropertyScope, periodId: string): IClosePeriodCommand => ({ ...p, ...s, periodId });

// ── POST .../leases/:leaseId/close ─────────────────────────────────────────────────
export const closeLeasePayloadSchema = z
  .object({
    terminatedAt: isoDateSchema,
    reason: z.string().trim().max(1000).optional(),
    readings: readingsSchema,
    ...invoiceFields,
    refund: z
      .object({
        /** Skip creating a refund (e.g. nothing was paid). */
        skip: z.boolean().default(false),
        method: paymentMethodSchema.optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .default({ skip: false }),
  })
  .superRefine(signRule);
export type ICloseLeasePayload = z.infer<typeof closeLeasePayloadSchema>;
export interface ICloseLeaseCommand extends ICloseLeasePayload, IPropertyScope {
  leaseId: string;
}
export const toCloseLeaseCommand = (p: ICloseLeasePayload, s: IPropertyScope, leaseId: string): ICloseLeaseCommand => ({ ...p, ...s, leaseId });

// ── POST .../leases/:leaseId/subscriptions  (mid-term aware) ───────────────────────
export const addSubscriptionPayloadSchema = z
  .object({
    ...subscriptionFields,
    /** Mid-term, non-meter: what to bill until the end of the running period (default: prorated suggestion). */
    amount: vndSchema.optional(),
    dueDate: isoDateSchema.optional(),
    /** Mid-term, meter: the reading on the start date, if it is not stored yet. */
    reading: z.number().min(0).max(999_999_999_999).optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: "endDate must be on/after startDate", path: ["endDate"] });
export type IAddSubscriptionPayload = z.infer<typeof addSubscriptionPayloadSchema>;
export interface IAddSubscriptionCommand extends IAddSubscriptionPayload, IPropertyScope {
  leaseId: string;
}
export const toAddSubscriptionCommand = (p: IAddSubscriptionPayload, s: IPropertyScope, leaseId: string): IAddSubscriptionCommand => ({ ...p, ...s, leaseId });

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IStartLeaseResponse {
  leaseId: string;
  period: IBillingPeriodDetailResponse;
  invoice: IAdminInvoiceDetailResponse;
}
export interface IClosePeriodResponse {
  period: IBillingPeriodDetailResponse;
  next: IBillingPeriodDetailResponse | null;
  invoice: IAdminInvoiceDetailResponse | null;
}
export interface ICloseLeaseResponse {
  leaseId: string;
  terminatedAt: string;
  period: IBillingPeriodDetailResponse | null;
  invoice: IAdminInvoiceDetailResponse | null;
  refund: IRefundResponse | null;
}
export interface IAddSubscriptionResponse extends ISubscriptionResponse {
  /** The usage created in the running period (null when the lease has no running period yet). */
  usageId: string | null;
  invoice: IAdminInvoiceDetailResponse | null;
}

// ── plans: what the usecases hand to the repository, to be stored in ONE transaction ──
export interface IPlanItem {
  kind: z.infer<typeof invoiceItemKindSchema>;
  title: string;
  amount: number;
  /** Which usage this line bills: the subscription's usage in the new or in the closed period. */
  usage?: { subscriptionId: string; period: "new" | "closed" };
  detail: IUsageDetail | null;
}
export interface IPlanLine extends IPlanItem {
  key: string;
}
export interface IInvoicePlan {
  kind: InvoiceKind;
  /** Which period the invoice belongs to (null = none). */
  period: "new" | "closed" | null;
  title: string;
  dueDate: string;
  items: IPlanItem[];
}
export interface IClosePlan {
  periodId: string;
  endDate: string;
  closings: { usageId: string; meterId: string; on: string; quantity: number }[];
}
export type { IPriceVersion };
