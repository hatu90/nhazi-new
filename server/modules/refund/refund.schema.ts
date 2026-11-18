import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, isoDateSchema, vndSchema } from "@/server/shared/schema";
import { paymentMethodSchema, type PaymentMethod } from "../invoice/invoice.schema";

export const refundKindSchema = z.enum(["deposit", "unused_rent", "unused_service", "other"]);
export type RefundKind = z.infer<typeof refundKindSchema>;
export const refundStatusSchema = z.enum(["pending", "paid", "cancelled"]);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

export const refundListQuerySchema = paginationQuerySchema.extend({ leaseId: idSchema.optional(), status: refundStatusSchema.optional() });
export type IRefundListQuery = z.infer<typeof refundListQuerySchema>;

export const createRefundPayloadSchema = z.object({
  leaseId: idSchema,
  billingPeriodId: idSchema.optional(),
  method: paymentMethodSchema.optional(),
  note: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z
        .object({
          invoiceId: idSchema,
          kind: refundKindSchema,
          /** the invoice line being refunded; omit for a deposit given back as a whole */
          invoiceItemId: idSchema.optional(),
          title: z.string().trim().min(1).max(200),
          chargedAmount: vndSchema,
          unusedDays: z.number().int().min(0).max(3660).optional(),
          totalDays: z.number().int().min(1).max(3660).optional(),
          amount: vndSchema,
          note: z.string().trim().max(1000).optional(),
        })
        .refine((i) => i.amount <= i.chargedAmount, { message: "amount cannot exceed chargedAmount", path: ["amount"] })
        .refine((i) => i.unusedDays === undefined || i.totalDays === undefined || i.unusedDays <= i.totalDays, {
          message: "unusedDays cannot exceed totalDays",
          path: ["unusedDays"],
        }),
    )
    .min(1)
    .max(50),
});
export type ICreateRefundPayload = z.infer<typeof createRefundPayloadSchema>;
export interface ICreateRefundCommand extends ICreateRefundPayload, IPropertyScope {}
export const toCreateRefundCommand = (p: ICreateRefundPayload, s: IPropertyScope): ICreateRefundCommand => ({ ...p, ...s });

export const payRefundPayloadSchema = z.object({ method: paymentMethodSchema.optional(), paidOn: isoDateSchema.optional() });
export type IPayRefundPayload = z.infer<typeof payRefundPayloadSchema>;
export interface IPayRefundCommand extends IPayRefundPayload, IPropertyScope {
  refundId: string;
}
export const toPayRefundCommand = (p: IPayRefundPayload, s: IPropertyScope, refundId: string): IPayRefundCommand => ({ ...p, ...s, refundId });

export interface IRefundItemResponse {
  id: string;
  invoiceId: string;
  invoiceItemId: string | null;
  kind: RefundKind;
  title: string;
  chargedAmount: number;
  unusedDays: number | null;
  totalDays: number | null;
  amount: number;
  note: string | null;
}
export interface IRefundResponse {
  id: string;
  leaseId: string;
  billingPeriodId: string | null;
  amount: number;
  status: RefundStatus;
  method: PaymentMethod | null;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
  items: IRefundItemResponse[];
}
export type IRefundListResponse = IPaginated<IRefundResponse>;

/** Facts the caps are checked against (read by the repository, judged by the usecase). */
export interface IInvoiceFacts {
  id: string;
  leaseId: string;
  cancelled: boolean;
  paidAmount: number;
  refundedAmount: number;
  items: Map<string, { amount: number; refundedAmount: number }>;
}
