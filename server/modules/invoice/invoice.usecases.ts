import { noNotifier, type INotifier } from "../notification/notification.publisher";
import { usageCost } from "@/lib/billing/pricing";
import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { leaseFilePrefix } from "../storage/storage.usecases";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { ILeaseRepository } from "../lease/lease.repository";
import type { IInvoiceRepository } from "./invoice.repository";
import type {
  IAdminInvoiceDetailResponse,
  IAdminInvoiceListQuery,
  IAdminInvoiceListResponse,
  ICreateInvoiceCommand,
  IPaymentResponse,
  IRecordPaymentCommand,
  IReportPaymentCommand,
  IReviewPaymentCommand,
} from "./invoice.schema";

type Inv = { invoiceId: string };
abstract class Base {
  constructor(protected readonly invoices: IInvoiceRepository, protected readonly policy: AccessPolicy, protected readonly notifier: INotifier = noNotifier) {}
  protected async get(propertyId: string, invoiceId: string) {
    const i = await this.invoices.findById(propertyId, invoiceId);
    if (!i) throw new NotFoundError("Invoice");
    return i;
  }
}

export class ListInvoicesUseCase extends Base implements IUseCase<IPropertyScope & { query: IAdminInvoiceListQuery }, IAdminInvoiceListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IAdminInvoiceListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.invoices.list(propertyId, query);
  }
}
export class GetInvoiceUseCase extends Base implements IUseCase<IPropertyScope & Inv, IAdminInvoiceDetailResponse> {
  async execute({ actor, propertyId, invoiceId }: IPropertyScope & Inv) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.get(propertyId, invoiceId);
  }
}
export class CreateInvoiceUseCase extends Base implements IUseCase<ICreateInvoiceCommand, IAdminInvoiceDetailResponse> {
  async execute(c: ICreateInvoiceCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.invoices.leaseExists(c.propertyId, c.leaseId))) throw new NotFoundError("Lease");
    if (c.billingPeriodId && !(await this.invoices.periodBelongsToLease(c.leaseId, c.billingPeriodId))) throw new NotFoundError("Billing period");

    // usage lines: the usage must be ready and unbilled; keep what the frozen price calculates next to the admin's amount
    const ids = c.items.flatMap((it) => (it.usageId ? [it.usageId] : []));
    const usages = new Map((await this.invoices.findUsages(c.leaseId, ids)).map((u) => [u.id, u]));
    const items = c.items.map((it) => {
      if (!it.usageId) return { ...it, detail: null };
      const u = usages.get(it.usageId);
      if (!u) throw new NotFoundError("Usage");
      if (u.billed) throw new ConflictError("This usage is already on an invoice", "USAGE_BILLED");
      if (u.quantity === null) throw new ConflictError("The usage has no quantity yet: close the period first", "USAGE_NOT_READY");
      return { ...it, detail: { quantity: u.quantity, price: u.price, calculatedAmount: usageCost({ quantity: u.quantity, price: u.price }).amount } };
    });
    const id = await this.invoices.create({ ...c, items });
    await this.notifier.publish({ event: "invoice.created", targetType: "invoice", targetId: id, actorId: c.actor.accountId });
    return this.get(c.propertyId, id);
  }
}
export class RecordPaymentUseCase extends Base implements IUseCase<IRecordPaymentCommand, IPaymentResponse> {
  async execute(c: IRecordPaymentCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const p = await this.invoices.recordPayment(c);
    if (!p) throw new NotFoundError("Invoice");
    if (p.status === "confirmed") await this.notifier.publish({ event: "payment.recorded", targetType: "payment", targetId: p.id, actorId: c.actor.accountId });
    return p;
  }
}
/** Tenant: report that an invoice was paid. Stays pending until an admin confirms it. */
export class ReportPaymentUseCase implements IUseCase<IReportPaymentCommand, IPaymentResponse> {
  constructor(private readonly invoices: IInvoiceRepository, private readonly leases: ILeaseRepository, private readonly notifier: INotifier = noNotifier) {}
  async execute(c: IReportPaymentCommand) {
    if (!(await this.leases.isTenant(c.actor.accountId, c.leaseId))) throw new NotFoundError("Lease");
    if (c.evidence.some((e) => !e.startsWith(leaseFilePrefix(c.leaseId)))) throw new ValidationError("Invalid attachment");
    const p = await this.invoices.reportPayment(c);
    if (!p) throw new NotFoundError("Invoice");
    await this.notifier.publish({ event: "payment.reported", targetType: "payment", targetId: p.id, actorId: c.actor.accountId });
    return p;
  }
}
export class ReviewPaymentUseCase extends Base implements IUseCase<IReviewPaymentCommand, IPaymentResponse> {
  async execute(c: IReviewPaymentCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const p = await this.invoices.reviewPayment(c);
    if (!p) throw new NotFoundError("Payment");
    await this.notifier.publish({ event: c.decision === "confirm" ? "payment.confirmed" : "payment.rejected", targetType: "payment", targetId: p.id, actorId: c.actor.accountId });
    return p;
  }
}
export class DeletePaymentUseCase extends Base implements IUseCase<IPropertyScope & Inv & { paymentId: string }, void> {
  async execute({ actor, propertyId, invoiceId, paymentId }: IPropertyScope & Inv & { paymentId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if (!(await this.invoices.deletePayment(propertyId, invoiceId, paymentId))) throw new NotFoundError("Payment");
  }
}
export class CancelInvoiceUseCase extends Base implements IUseCase<IPropertyScope & Inv, IAdminInvoiceDetailResponse> {
  async execute({ actor, propertyId, invoiceId }: IPropertyScope & Inv) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if ((await this.invoices.cancel(propertyId, invoiceId)) === null) throw new NotFoundError("Invoice");
    await this.notifier.publish({ event: "invoice.cancelled", targetType: "invoice", targetId: invoiceId, actorId: actor.accountId });
    return this.get(propertyId, invoiceId);
  }
}
