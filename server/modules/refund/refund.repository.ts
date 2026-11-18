import type { IPaginated } from "@/server/shared/pagination";
import type { PaymentMethod } from "../invoice/invoice.schema";
import type { ICreateRefundCommand, IInvoiceFacts, IRefundListQuery, IRefundResponse } from "./refund.schema";

export interface IRefundRepository {
  list(propertyId: string, query: IRefundListQuery): Promise<IPaginated<IRefundResponse>>;
  findById(propertyId: string, refundId: string): Promise<IRefundResponse | null>;
  leaseExists(propertyId: string, leaseId: string): Promise<boolean>;
  periodBelongsToLease(leaseId: string, billingPeriodId: string): Promise<boolean>;
  /** Paid / already-refunded totals (cancelled refunds excluded) per invoice and per invoice line. */
  invoiceFacts(propertyId: string, invoiceIds: string[]): Promise<Map<string, IInvoiceFacts>>;
  create(command: ICreateRefundCommand): Promise<string>;
  /** Only a pending refund can be paid / cancelled; false = not found or not pending. */
  markPaid(propertyId: string, refundId: string, method: PaymentMethod, paidOn: string | null): Promise<boolean>;
  cancel(propertyId: string, refundId: string): Promise<boolean>;
}
