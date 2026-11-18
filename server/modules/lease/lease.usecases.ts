import type { IActor } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { resolveLeaseStatus, resolveRent, today } from "./lease.rules";
import type { ILeaseDetailRecord, ILeaseRepository, ILeaseSummaryRecord } from "./lease.repository";
import type {
  IInvoiceDetailResponse,
  IInvoiceListQuery,
  IInvoiceListResponse,
  ILeaseDetailResponse,
  ILeaseListQuery,
  ILeaseListResponse,
  ILeaseSummaryResponse,
} from "./lease.schema";

const toSummary = (r: ILeaseSummaryRecord, on: string): ILeaseSummaryResponse => {
  const { rentVersions, ...rest } = r;
  return { ...rest, status: resolveLeaseStatus(r, on), currentRent: resolveRent(rentVersions, on) };
};

export class ListMyLeasesUseCase implements IUseCase<{ actor: IActor; query: ILeaseListQuery }, ILeaseListResponse> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, query }: { actor: IActor; query: ILeaseListQuery }) {
    const page = await this.leases.listByTenant(actor.accountId, query);
    const on = today();
    return { ...page, items: page.items.map((r) => toSummary(r, on)) };
  }
}

export class GetMyLeaseUseCase implements IUseCase<{ actor: IActor; leaseId: string }, ILeaseDetailResponse> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId }: { actor: IActor; leaseId: string }) {
    const record: ILeaseDetailRecord | null = await this.leases.findByTenant(actor.accountId, leaseId);
    if (!record) throw new NotFoundError("Lease");
    const on = today();
    return { ...record, status: resolveLeaseStatus(record, on), currentRent: resolveRent(record.rentVersions, on) };
  }
}

export class ListMyLeaseInvoicesUseCase
  implements IUseCase<{ actor: IActor; leaseId: string; query: IInvoiceListQuery }, IInvoiceListResponse>
{
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId, query }: { actor: IActor; leaseId: string; query: IInvoiceListQuery }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    return this.leases.listInvoices(leaseId, query);
  }
}

export class GetMyInvoiceUseCase implements IUseCase<{ actor: IActor; leaseId: string; invoiceId: string }, IInvoiceDetailResponse> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId, invoiceId }: { actor: IActor; leaseId: string; invoiceId: string }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    const invoice = await this.leases.findInvoice(leaseId, invoiceId);
    if (!invoice) throw new NotFoundError("Invoice");
    return invoice;
  }
}
