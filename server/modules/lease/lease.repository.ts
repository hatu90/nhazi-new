import type { IPaginated } from "@/server/shared/pagination";
import type { ILeaseDocument, IInvoiceDetailResponse, IInvoiceListQuery, IInvoiceResponse, ILeaseDetailResponse, ILeaseListQuery, ILeaseSummaryResponse, IMonthBreakdown, IRentVersion } from "./lease.schema";

/** What storage knows. Derived fields (status, currentRent) are added by the usecases. */
export type ILeaseSummaryRecord = Omit<ILeaseSummaryResponse, "status" | "currentRent"> & { rentVersions: IRentVersion[]; activatedAt: string | null };
export type ILeaseDetailRecord = Omit<ILeaseDetailResponse, "status" | "currentRent"> & { activatedAt: string | null };

/** Every method is scoped to a tenant account: a lease that is not theirs simply is not found. */
export interface ILeaseRepository {
  listByTenant(accountId: string, query: ILeaseListQuery): Promise<IPaginated<ILeaseSummaryRecord>>;
  findByTenant(accountId: string, leaseId: string): Promise<ILeaseDetailRecord | null>;
  isTenant(accountId: string, leaseId: string): Promise<boolean>;
  /** Append documents (skipping paths already attached); returns the full list. */
  addDocuments(leaseId: string, documents: ILeaseDocument[]): Promise<ILeaseDocument[]>;
  /** Agreement templates of the lease's property (not deleted). */
  listTemplates(leaseId: string): Promise<{ id: string; name: string }[]>;
  /** Add an agreement from the template (its current version is pinned); false when the template is not the property's. */
  addAgreement(leaseId: string, templateId: string): Promise<boolean>;
  /** false when the lease has no such agreement. */
  removeAgreement(leaseId: string, agreementId: string): Promise<boolean>;
  /** Save one agreement's form values; false when the lease has no such agreement. */
  setAgreementValues(leaseId: string, agreementId: string, values: Record<string, unknown>): Promise<boolean>;
  findInvoice(leaseId: string, invoiceId: string): Promise<IInvoiceDetailResponse | null>;
  /** What the lease was invoiced in each of the `months` latest calendar months up to `now` (oldest first; empty leading months dropped, at least 3 kept). */
  monthBreakdown(leaseId: string, months: number, now: string): Promise<IMonthBreakdown[]>;
  listInvoices(leaseId: string, query: IInvoiceListQuery): Promise<IPaginated<IInvoiceResponse>>;
}
