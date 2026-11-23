import type { IActor } from "@/server/shared/actor";
import { addDays } from "@/lib/billing/pricing";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import type { ILifecycleRepository } from "../lifecycle/lifecycle.repository";
import type { ICloseMyPeriodPayload } from "../lifecycle/lifecycle.schema";
import type { ClosePeriodUseCase } from "../lifecycle/lifecycle.usecases";
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
  ICloseMyPeriodResponse,
  IMyBillingResponse,
} from "./lease.schema";

const toSummary = (r: ILeaseSummaryRecord, on: string): ILeaseSummaryResponse => {
  const { rentVersions, activatedAt, ...rest } = r;
  return { ...rest, status: resolveLeaseStatus({ ...r, activatedAt }, on), currentRent: resolveRent(rentVersions, on) };
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
    const { activatedAt, ...rest } = record;
    return { ...rest, status: resolveLeaseStatus({ ...record, activatedAt }, on), currentRent: resolveRent(record.rentVersions, on) };
  }
}

export class ListMyAgreementTemplatesUseCase implements IUseCase<{ actor: IActor; leaseId: string }, { items: { id: string; name: string }[] }> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId }: { actor: IActor; leaseId: string }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    return { items: await this.leases.listTemplates(leaseId) };
  }
}

/** Tenant: add an agreement from one of the property's templates. */
export class AddMyAgreementUseCase implements IUseCase<{ actor: IActor; leaseId: string; templateId: string }, { ok: true }> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId, templateId }: { actor: IActor; leaseId: string; templateId: string }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    if (!(await this.leases.addAgreement(leaseId, templateId))) throw new NotFoundError("Agreement template");
    return { ok: true as const };
  }
}

/** Tenant: remove one of the lease's agreements. */
export class RemoveMyAgreementUseCase implements IUseCase<{ actor: IActor; leaseId: string; agreementId: string }, { ok: true }> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId, agreementId }: { actor: IActor; leaseId: string; agreementId: string }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    if (!(await this.leases.removeAgreement(leaseId, agreementId))) throw new NotFoundError("Agreement");
    return { ok: true as const };
  }
}

/** Tenant: fill in the values of one agreement's form. */
export class SetMyAgreementValuesUseCase implements IUseCase<{ actor: IActor; leaseId: string; agreementId: string; values: Record<string, unknown> }, { ok: true }> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute({ actor, leaseId, agreementId, values }: { actor: IActor; leaseId: string; agreementId: string; values: Record<string, unknown> }) {
    if (!(await this.leases.isTenant(actor.accountId, leaseId))) throw new NotFoundError("Lease");
    if (!(await this.leases.setAgreementValues(leaseId, agreementId, values))) throw new NotFoundError("Agreement");
    return { ok: true as const };
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

const BREAKDOWN_MONTHS = 5;

/** Same day of the next month (clamped to its last day). */
const addMonth = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
};

/** The running period (with the meters to read) and the invoice split of the latest periods. */
export class GetMyBillingUseCase implements IUseCase<{ actor: IActor; leaseId: string }, IMyBillingResponse> {
  constructor(private readonly leases: ILeaseRepository, private readonly life: ILifecycleRepository) {}
  async execute({ actor, leaseId }: { actor: IActor; leaseId: string }): Promise<IMyBillingResponse> {
    const lease = await this.leases.findByTenant(actor.accountId, leaseId);
    if (!lease) throw new NotFoundError("Lease");
    const [ctx, months] = await Promise.all([this.life.load(lease.propertyId, leaseId), this.leases.monthBreakdown(leaseId, BREAKDOWN_MONTHS, today())]);
    const a = ctx?.active ?? null;
    return {
      current: a && {
        id: a.id,
        startDate: a.startDate,
        endDate: a.endDate,
        rentAmount: a.rentAmount,
        services: a.usages.map((u) => ({ subscriptionId: u.subscriptionId, serviceName: u.serviceName, usageBase: u.usageBase })),
        meters: a.usages.filter((u) => u.usageBase === "meter" && u.meterId).map((u) => ({ meterId: u.meterId!, serviceName: u.serviceName, openingValue: u.openingValue ?? 0 })),
      },
      months,
    };
  }
}

/**
 * The tenant reads the meters and closes the running period; the next period (a month long, capped by the lease end)
 * opens and its invoice is issued: next rent, the non-meter services, and this period's metered services (from the readings).
 */
export class CloseMyPeriodUseCase implements IUseCase<{ actor: IActor; leaseId: string; payload: ICloseMyPeriodPayload }, ICloseMyPeriodResponse> {
  constructor(private readonly leases: ILeaseRepository, private readonly life: ILifecycleRepository, private readonly closer: ClosePeriodUseCase) {}
  async execute({ actor, leaseId, payload }: { actor: IActor; leaseId: string; payload: ICloseMyPeriodPayload }): Promise<ICloseMyPeriodResponse> {
    const cmd = await this.command(actor, leaseId, payload);
    const r = await this.closer.run(cmd);
    return { closedPeriodId: r.period.id, nextPeriodId: r.next?.id ?? null, invoiceId: r.invoice?.id ?? null };
  }
  /** The invoice closing would issue, nothing written. */
  async preview({ actor, leaseId, payload }: { actor: IActor; leaseId: string; payload: ICloseMyPeriodPayload }) {
    return this.closer.previewRun(await this.command(actor, leaseId, payload));
  }
  private async command(actor: IActor, leaseId: string, payload: ICloseMyPeriodPayload) {
    const lease = await this.leases.findByTenant(actor.accountId, leaseId);
    if (!lease) throw new NotFoundError("Lease");
    const active = (await this.life.load(lease.propertyId, leaseId))?.active;
    if (!active) throw new ConflictError("There is no running billing period", "NO_ACTIVE_PERIOD");
    const endDate = payload.endDate ?? active.endDate;
    const leaseEnd = lease.terminatedAt ?? lease.endDate;
    let nextEnd = addDays(addMonth(addDays(endDate, 1)), -1);
    if (leaseEnd && nextEnd > leaseEnd) nextEnd = leaseEnd;
    return { actor, propertyId: lease.propertyId, periodId: active.id, endDate, readings: payload.readings, next: { endDate: nextEnd }, overrides: {}, extraItems: [] };
  }
}
