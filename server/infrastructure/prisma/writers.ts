/**
 * Transaction-level writers shared by the single-step repositories and the lifecycle repository
 * (start lease, roll a period over, close a lease ...). One implementation of "how a period / invoice /
 * refund / reading is stored", so the multi-step actions can run them inside ONE transaction.
 */
import type { INewPeriod } from "@/server/modules/billing/billing.repository";
import type { INewInvoice } from "@/server/modules/invoice/invoice.schema";
import { ConflictError, ValidationError } from "@/server/shared/errors";
import type { Prisma } from "./client";
import { num, toJson } from "./mappers";

export type Tx = Prisma.TransactionClient;
const d = (v: string) => new Date(v);

export interface IReadingWrite {
  meterId: string;
  /** The day the reading belongs to (the date of `at` when given). */
  on: string;
  value: number;
  /** When the meter was read (ISO timestamp). Defaults to the start of `on`. */
  at?: string;
}

/** Same rules as POST /meters/:id/readings: monotonic over time (by timestamp). A reading already there with the same value is fine (idempotent). */
export async function insertReadings(tx: Tx, propertyId: string, readBy: string, readings: IReadingWrite[]) {
  for (const r of readings) {
    const at = r.at ? new Date(r.at) : d(r.on);
    const on = d(at.toISOString().slice(0, 10));
    const same = await tx.reading.findFirst({ where: { meterId: r.meterId, readAt: at, deletedAt: null }, select: { readingValue: true } });
    if (same) {
      if (num(same.readingValue) !== r.value) throw new ConflictError(`A different reading (${num(same.readingValue)}) already exists at ${at.toISOString()}`, "READING_EXISTS");
      continue;
    }
    const [prev, next] = await Promise.all([
      tx.reading.findFirst({ where: { meterId: r.meterId, readAt: { lt: at }, deletedAt: null }, orderBy: { readAt: "desc" }, select: { readingValue: true } }),
      tx.reading.findFirst({ where: { meterId: r.meterId, readAt: { gt: at }, deletedAt: null }, orderBy: { readAt: "asc" }, select: { readingValue: true } }),
    ]);
    if (prev && r.value < num(prev.readingValue)) {
      throw new ValidationError("Reading is lower than the previous one", { fieldErrors: { readings: [`Meter ${r.meterId}: must be >= ${num(prev.readingValue)}`] } });
    }
    if (next && r.value > num(next.readingValue)) {
      throw new ValidationError("Reading is higher than the next one", { fieldErrors: { readings: [`Meter ${r.meterId}: must be <= ${num(next.readingValue)}`] } });
    }
    await tx.reading.create({ data: { propertyId, meterId: r.meterId, readOn: on, readAt: at, readingValue: r.value, readBy } });
  }
}

export async function readingIdAt(tx: Tx, meterId: string, on: string): Promise<string> {
  const r = await tx.reading.findFirst({ where: { meterId, readOn: d(on), deletedAt: null }, orderBy: { readAt: "desc" }, select: { id: true } });
  if (!r) throw new ConflictError(`Missing meter reading on ${on}`, "MISSING_READING");
  return r.id;
}

/** Period + its usages (opening readings are looked up by meter + date, so they may have been inserted just before). */
export async function createPeriodTx(tx: Tx, c: INewPeriod): Promise<string> {
  const period = await tx.billingPeriod.create({
    data: { propertyId: c.propertyId, leaseId: c.leaseId, startDate: d(c.startDate), endDate: d(c.endDate), rentAmount: c.rentAmount },
    select: { id: true },
  });
  for (const u of c.usages) {
    await tx.usage.create({
      data: {
        propertyId: c.propertyId,
        leaseId: c.leaseId,
        billingPeriodId: period.id,
        subscriptionId: u.subscriptionId,
        openingReadingId: u.opening ? await readingIdAt(tx, u.opening.meterId, u.opening.on) : null,
        quantity: u.quantity,
        price: toJson(u.price),
      },
    });
  }
  return period.id;
}

export async function usageIdOf(tx: Tx, billingPeriodId: string, subscriptionId: string): Promise<string> {
  const u = await tx.usage.findFirst({ where: { billingPeriodId, subscriptionId }, select: { id: true } });
  if (!u) throw new ConflictError("Usage not found for the subscription", "USAGE_MISSING");
  return u.id;
}

/** Set the closing readings + metered quantities, move the end date, mark the period closed (only while active). */
export async function closePeriodTx(
  tx: Tx,
  periodId: string,
  endDate: string,
  closings: { usageId: string; meterId: string; on: string; quantity: number }[],
): Promise<void> {
  const closed = await tx.billingPeriod.updateMany({ where: { id: periodId, status: "active" }, data: { status: "closed", endDate: d(endDate) } });
  if (closed.count === 0) throw new ConflictError("The period is already closed", "PERIOD_CLOSED");
  for (const c of closings) {
    await tx.usage.update({ where: { id: c.usageId }, data: { closingReadingId: await readingIdAt(tx, c.meterId, c.on), quantity: c.quantity } });
  }
}

export async function createInvoiceTx(tx: Tx, c: INewInvoice): Promise<string> {
  const total = c.items.reduce((s, i) => s + i.amount, 0);
  const r = await tx.invoice.create({
    data: {
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      kind: c.kind,
      billingPeriodId: c.billingPeriodId,
      title: c.title,
      amount: total,
      dueDate: d(c.dueDate),
      targetMetadata: toJson({ source: c.kind === "other" ? "manual" : "billing" }),
      createdBy: c.actor.accountId,
      invoiceItems: {
        create: c.items.map((it, seq) => ({
          seq,
          kind: it.kind,
          title: it.title,
          amount: it.amount,
          usageId: it.usageId,
          detail: it.detail ? toJson(it.detail) : undefined,
        })),
      },
    },
    select: { id: true },
  });
  return r.id;
}

export interface INewRefund {
  propertyId: string;
  leaseId: string;
  billingPeriodId: string | null;
  createdBy: string;
  method?: "cash" | "bank_transfer";
  note?: string;
  items: {
    invoiceId: string;
    invoiceItemId?: string;
    kind: "deposit" | "unused_rent" | "unused_service" | "other";
    title: string;
    chargedAmount: number;
    unusedDays?: number;
    totalDays?: number;
    amount: number;
    note?: string;
  }[];
}
export async function createRefundTx(tx: Tx, c: INewRefund): Promise<string> {
  const r = await tx.refund.create({
    data: {
      propertyId: c.propertyId,
      leaseId: c.leaseId,
      billingPeriodId: c.billingPeriodId,
      amount: c.items.reduce((s, i) => s + i.amount, 0),
      method: c.method,
      note: c.note,
      createdBy: c.createdBy,
      refundItems: { create: c.items },
    },
    select: { id: true },
  });
  return r.id;
}
