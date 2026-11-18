import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IRefundRepository } from "./refund.repository";
import type { ICreateRefundCommand, IPayRefundCommand, IRefundListQuery, IRefundListResponse, IRefundResponse } from "./refund.schema";

type Ref = { refundId: string };
const bad = (message: string, path: string) => new ValidationError(message, { fieldErrors: { [path]: [message] } });

abstract class Base {
  constructor(protected readonly refunds: IRefundRepository, protected readonly policy: AccessPolicy) {}
  protected async get(propertyId: string, refundId: string) {
    const r = await this.refunds.findById(propertyId, refundId);
    if (!r) throw new NotFoundError("Refund");
    return r;
  }
}

export class ListRefundsUseCase extends Base implements IUseCase<IPropertyScope & { query: IRefundListQuery }, IRefundListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IRefundListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.refunds.list(propertyId, query);
  }
}
export class GetRefundUseCase extends Base implements IUseCase<IPropertyScope & Ref, IRefundResponse> {
  async execute({ actor, propertyId, refundId }: IPropertyScope & Ref) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.get(propertyId, refundId);
  }
}

/**
 * Rules: money can only go back where it came from.
 *  - every invoice belongs to the lease and is not cancelled
 *  - total refunded per invoice <= what was actually paid on it
 *  - a refunded invoice line must match its charge, and total refunded per line <= that charge
 */
export class CreateRefundUseCase extends Base implements IUseCase<ICreateRefundCommand, IRefundResponse> {
  async execute(c: ICreateRefundCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.refunds.leaseExists(c.propertyId, c.leaseId))) throw new NotFoundError("Lease");
    if (c.billingPeriodId && !(await this.refunds.periodBelongsToLease(c.leaseId, c.billingPeriodId))) throw bad("Billing period is not on this lease", "billingPeriodId");

    const facts = await this.refunds.invoiceFacts(c.propertyId, [...new Set(c.items.map((i) => i.invoiceId))]);
    const perInvoice = new Map<string, number>();
    const perItem = new Map<string, number>();
    for (const [n, it] of c.items.entries()) {
      const f = facts.get(it.invoiceId);
      if (!f || f.leaseId !== c.leaseId) throw bad("Invoice is not on this lease", `items.${n}.invoiceId`);
      if (f.cancelled) throw new ConflictError("A cancelled invoice cannot be refunded", "INVOICE_CANCELLED");
      perInvoice.set(it.invoiceId, (perInvoice.get(it.invoiceId) ?? 0) + it.amount);
      if (it.invoiceItemId) {
        const line = f.items.get(it.invoiceItemId);
        if (!line) throw bad("Invoice line is not on that invoice", `items.${n}.invoiceItemId`);
        if (it.chargedAmount !== line.amount) throw bad(`chargedAmount must equal the invoice line (${line.amount})`, `items.${n}.chargedAmount`);
        perItem.set(it.invoiceItemId, (perItem.get(it.invoiceItemId) ?? 0) + it.amount);
      }
    }
    for (const [invoiceId, total] of perInvoice) {
      const f = facts.get(invoiceId)!;
      if (f.refundedAmount + total > f.paidAmount) {
        throw new ConflictError(`Refunds would exceed the ${f.paidAmount} paid on the invoice (already refunded ${f.refundedAmount})`, "REFUND_EXCEEDS_PAID");
      }
    }
    for (const [itemId, total] of perItem) {
      const line = [...facts.values()].map((f) => f.items.get(itemId)).find(Boolean)!;
      if (line.refundedAmount + total > line.amount) {
        throw new ConflictError(`Refunds would exceed the invoice line (${line.amount}, already refunded ${line.refundedAmount})`, "REFUND_EXCEEDS_CHARGE");
      }
    }
    const id = await this.refunds.create(c);
    return this.get(c.propertyId, id);
  }
}

export class PayRefundUseCase extends Base implements IUseCase<IPayRefundCommand, IRefundResponse> {
  async execute(c: IPayRefundCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const refund = await this.get(c.propertyId, c.refundId);
    const method = c.method ?? refund.method;
    if (!method) throw bad("A payment method is required", "method");
    if (!(await this.refunds.markPaid(c.propertyId, c.refundId, method, c.paidOn ?? null))) throw new ConflictError("Only a pending refund can be paid", "REFUND_NOT_PENDING");
    return this.get(c.propertyId, c.refundId);
  }
}

export class CancelRefundUseCase extends Base implements IUseCase<IPropertyScope & Ref, IRefundResponse> {
  async execute({ actor, propertyId, refundId }: IPropertyScope & Ref) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    await this.get(propertyId, refundId);
    if (!(await this.refunds.cancel(propertyId, refundId))) throw new ConflictError("Only a pending refund can be cancelled", "REFUND_NOT_PENDING");
    return this.get(propertyId, refundId);
  }
}
