import type { IPaginated } from "@/server/shared/pagination";
import type { IInvoiceDetailResponse, IInvoiceListQuery, IInvoiceResponse, ILeaseDetailResponse, ILeaseListQuery, ILeaseSummaryResponse, IRentVersion } from "./lease.schema";

/** What storage knows. Derived fields (status, currentRent) are added by the usecases. */
export type ILeaseSummaryRecord = Omit<ILeaseSummaryResponse, "status" | "currentRent"> & { rentVersions: IRentVersion[] };
export type ILeaseDetailRecord = Omit<ILeaseDetailResponse, "status" | "currentRent">;

/** Every method is scoped to a tenant account: a lease that is not theirs simply is not found. */
export interface ILeaseRepository {
  listByTenant(accountId: string, query: ILeaseListQuery): Promise<IPaginated<ILeaseSummaryRecord>>;
  findByTenant(accountId: string, leaseId: string): Promise<ILeaseDetailRecord | null>;
  isTenant(accountId: string, leaseId: string): Promise<boolean>;
  findInvoice(leaseId: string, invoiceId: string): Promise<IInvoiceDetailResponse | null>;
  listInvoices(leaseId: string, query: IInvoiceListQuery): Promise<IPaginated<IInvoiceResponse>>;
}
