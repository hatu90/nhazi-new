import { z } from "zod";
import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, invoiceKindSchema, invoiceStatusSchema, isoDateSchema, vndSchema, type InvoiceKind, type InvoiceStatus } from "@/server/shared/schema";

export const paymentMethodSchema = z.enum(["cash", "bank_transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
/** pending = reported by the tenant, counts only once an admin confirms it. */
export type PaymentStatus = "pending" | "confirmed" | "rejected";
export const invoiceItemKindSchema = z.enum(["rent", "service", "meter", "deposit", "credit", "other"]);
export type InvoiceItemKind = z.infer<typeof invoiceItemKindSchema>;

export const invoiceListQuerySchema = paginationQuerySchema.extend({
  leaseId: idSchema.optional(),
  status: invoiceStatusSchema.optional(),
  kind: invoiceKindSchema.optional(),
});
export type IAdminInvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/**
 * An invoice the admin writes: amounts are final (calculated on the frontend, negotiable).
 * kind = other : charges outside the billing cycle (repairs ...), no period.
 * kind = move_in | transition | closing : an event of a billing period; lines may point at that lease's usages.
 * Credits are negative lines.
 */
export const createInvoicePayloadSchema = z
  .object({
    leaseId: idSchema,
    kind: invoiceKindSchema.default("other"),
    billingPeriodId: idSchema.optional(),
    title: z.string().trim().min(1).max(200),
    dueDate: isoDateSchema,
    items: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(200),
          kind: invoiceItemKindSchema.default("other"),
          usageId: idSchema.optional(),
          amount: z.number().int().min(-99_999_999_999_999).max(99_999_999_999_999),
        }),
      )
      .min(1)
      .max(50),
  })
  .superRefine((v, ctx) => {
    v.items.forEach((it, i) => {
      if ((it.kind === "credit") !== it.amount < 0 && it.amount !== 0) {
        ctx.addIssue({ code: "custom", path: ["items", i, "amount"], message: "Only credit lines are negative (and credit lines must be negative)" });
      }
    });
    if ((v.kind === "other") !== (v.billingPeriodId === undefined)) {
      ctx.addIssue({ code: "custom", path: ["billingPeriodId"], message: "Required for move_in / transition / closing, not allowed for other" });
    }
    const usageIds = v.items.flatMap((it) => (it.usageId ? [it.usageId] : []));
    if (new Set(usageIds).size !== usageIds.length) ctx.addIssue({ code: "custom", path: ["items"], message: "A usage can be billed once per invoice" });
    if (v.items.reduce((s, it) => s + it.amount, 0) < 0) ctx.addIssue({ code: "custom", path: ["items"], message: "Invoice total cannot be negative" });
  });
export type ICreateInvoicePayload = z.infer<typeof createInvoicePayloadSchema>;
export interface ICreateInvoiceCommand extends ICreateInvoicePayload, IPropertyScope {}
/** What the repository stores: the command + the audit snapshot of every usage line (see the usecase). */
export interface IUsageDetail {
  quantity: number;
  price: IPriceVersion;
  /** quantity × frozen price (the full monthly cost for an advance line). `amount` may differ: prorated or negotiated. */
  calculatedAmount: number;
  /** Advance lines: the days of the period the service was live. */
  from?: string;
  to?: string;
}
export interface INewInvoice extends Omit<ICreateInvoiceCommand, "items"> {
  items: (ICreateInvoiceCommand["items"][number] & { detail: IUsageDetail | null })[];
}
export const toCreateInvoiceCommand = (p: ICreateInvoicePayload, s: IPropertyScope): ICreateInvoiceCommand => ({ ...p, ...s });

export const recordPaymentPayloadSchema = z.object({
  amount: vndSchema.refine((v) => v > 0, "Must be greater than 0"),
  method: paymentMethodSchema,
  paidOn: isoDateSchema,
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  evidence: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});
export type IRecordPaymentPayload = z.infer<typeof recordPaymentPayloadSchema>;
export interface IRecordPaymentCommand extends IRecordPaymentPayload, IPropertyScope {
  invoiceId: string;
}
export const toRecordPaymentCommand = (p: IRecordPaymentPayload, s: IPropertyScope, invoiceId: string): IRecordPaymentCommand => ({ ...p, ...s, invoiceId });

export type IReportPaymentPayload = IRecordPaymentPayload;
export interface IReportPaymentCommand extends IReportPaymentPayload {
  actor: IActor;
  leaseId: string;
  invoiceId: string;
}
export const toReportPaymentCommand = (p: IReportPaymentPayload, actor: IActor, leaseId: string, invoiceId: string): IReportPaymentCommand => ({ ...p, actor, leaseId, invoiceId });
export type PaymentDecision = "confirm" | "reject";
export interface IReviewPaymentCommand extends IPropertyScope {
  invoiceId: string;
  paymentId: string;
  decision: PaymentDecision;
}

export interface IPaymentResponse {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidOn: string;
  reference: string | null;
  notes: string | null;
  evidence: string[];
  createdBy: string;
  createdAt: string;
}
export interface IInvoiceItemResponse {
  id: string;
  parentId: string | null;
  seq: number;
  kind: InvoiceItemKind;
  title: string;
  amount: number;
  usageId: string | null;
  voided: boolean;
  /** Usage lines: quantity, frozen price and the calculated amount next to `amount` (the negotiated one). */
  detail: IUsageDetail | null;
}
export interface IAdminInvoiceResponse {
  id: string;
  leaseId: string;
  unitName: string;
  kind: InvoiceKind;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  cancelledAt: string | null;
  createdAt: string;
}
export interface IAdminInvoiceDetailResponse extends IAdminInvoiceResponse {
  billingPeriodId: string | null;
  items: IInvoiceItemResponse[];
  payments: IPaymentResponse[];
}
export type IAdminInvoiceListResponse = IPaginated<IAdminInvoiceResponse>;
