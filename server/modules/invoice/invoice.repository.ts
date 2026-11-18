import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IPaginated } from "@/server/shared/pagination";
import type {
  IAdminInvoiceDetailResponse,
  IAdminInvoiceListQuery,
  IAdminInvoiceResponse,
  INewInvoice,
  IPaymentResponse,
  IRecordPaymentCommand,
} from "./invoice.schema";

export interface IInvoiceRepository {
  list(propertyId: string, query: IAdminInvoiceListQuery): Promise<IPaginated<IAdminInvoiceResponse>>;
  findById(propertyId: string, invoiceId: string): Promise<IAdminInvoiceDetailResponse | null>;
  leaseExists(propertyId: string, leaseId: string): Promise<boolean>;
  periodBelongsToLease(leaseId: string, periodId: string): Promise<boolean>;
  /** Usages of the lease among `ids` (others are simply absent). */
  findUsages(leaseId: string, ids: string[]): Promise<{ id: string; quantity: number | null; price: IPriceVersion; billed: boolean }[]>;
  /** ConflictError EVENT_INVOICED (one live invoice per lease + period + kind) / USAGE_BILLED. */
  create(command: INewInvoice): Promise<string>;
  /**
   * Atomic (row-locked): rejects with ConflictError when the invoice is cancelled (INVOICE_CANCELLED)
   * or the payment exceeds what is still owed (OVERPAYMENT), then inserts it and recomputes the invoice status.
   * null = no such invoice in the property.
   */
  recordPayment(command: IRecordPaymentCommand): Promise<IPaymentResponse | null>;
  /** Soft-deletes the payment and recomputes the status. false = not found. */
  deletePayment(propertyId: string, invoiceId: string, paymentId: string): Promise<boolean>;
  /** Atomic: ConflictError INVOICE_HAS_PAYMENTS / ALREADY_CANCELLED; voids the items. null = not found. */
  cancel(propertyId: string, invoiceId: string): Promise<boolean | null>;
}
