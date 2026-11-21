/**
 * What ending a lease costs / returns, computed in the browser from data the admin screens already load.
 * Same rules as the server (which re-checks the caps when the lease is closed):
 *  - closing invoice: the final meter usage + any extra charges (e.g. damaged items)
 *  - refund lines: the deposit, the unused rent and the unused non-metered services, prorated by days,
 *    never more than the line charged nor than was paid on its invoice
 *  - what the tenant still owes on the invoice is taken from the deposit first, then rent, then services
 */
import { addDays, daysInclusive, prorate, usageCost } from "@/lib/billing/pricing";
import type { IAdminInvoiceDetailResponse, IBillingPeriodDetailResponse, IRefundResponse } from "@/client/lib/types";

export interface IBilledLine {
  invoiceId: string;
  invoiceItemId: string;
  role: "rent" | "service" | "deposit";
  subscriptionId: string | null;
  title: string;
  window: { from: string; to: string } | null;
  amount: number;
  refunded: number;
  invoicePaid: number;
  invoiceRefunded: number;
}
export interface ISettlementLine {
  key: string;
  title: string;
  /** What the line is worth: the deposit, or the unused part of the rent / service (prorated by days). */
  gross: number;
  /** What is left of it after the amount owed was taken. */
  net: number;
  /** The most that can be handed back in cash: what was actually paid on its invoice. */
  cap: number;
}
export interface ISettlement {
  invoice: { title: string; amount: number }[];
  /** Amount owed on the invoice before anything is taken from the money held. */
  charged: number;
  refund: ISettlementLine[];
}

/** The billed lines the refund is computed from: deposit, and the rent / advance services of `period`. */
export function billedLines(period: IBillingPeriodDetailResponse, invoices: IAdminInvoiceDetailResponse[], refunds: IRefundResponse[]): IBilledLine[] {
  const usageOf = new Map(period.usages.map((u) => [u.id, u]));
  const perItem = new Map<string, number>();
  const perInvoice = new Map<string, number>();
  for (const r of refunds) {
    if (r.status === "cancelled") continue;
    for (const i of r.items) {
      perInvoice.set(i.invoiceId, (perInvoice.get(i.invoiceId) ?? 0) + i.amount);
      if (i.invoiceItemId) perItem.set(i.invoiceItemId, (perItem.get(i.invoiceItemId) ?? 0) + i.amount);
    }
  }
  const out: IBilledLine[] = [];
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    for (const it of inv.items) {
      if (it.voided) continue;
      const usage = it.usageId ? usageOf.get(it.usageId) : undefined;
      const role = it.kind === "deposit" ? "deposit" : it.kind === "rent" && inv.billingPeriodId === period.id ? "rent" : it.kind === "service" && usage ? "service" : null;
      if (!role) continue;
      out.push({
        invoiceId: inv.id,
        invoiceItemId: it.id,
        role,
        subscriptionId: usage?.subscriptionId ?? null,
        title: it.title,
        window: it.detail?.from && it.detail?.to ? { from: it.detail.from, to: it.detail.to } : null,
        amount: it.amount,
        refunded: perItem.get(it.id) ?? 0,
        invoicePaid: inv.paidAmount,
        invoiceRefunded: perInvoice.get(inv.id) ?? 0,
      });
    }
  }
  return out;
}

function unused(b: IBilledLine, period: { startDate: string; endDate: string }, endsOn: string) {
  const from = b.window?.from ?? period.startDate;
  const to = b.window?.to ?? period.endDate;
  const total = daysInclusive(from, to);
  if (endsOn >= to) return { unused: 0, total };
  const first = addDays(endsOn, 1) > from ? addDays(endsOn, 1) : from;
  return { unused: daysInclusive(first, to), total };
}

const keyOf = (b: IBilledLine) => (b.role === "rent" ? "refund:rent" : b.role === "deposit" ? "refund:deposit" : `refund:service:${b.subscriptionId}`);
const rank = (k: string) => (k === "refund:deposit" ? 0 : k === "refund:rent" ? 1 : 2);

export function settle(input: {
  period: IBillingPeriodDetailResponse;
  terminatedAt: string;
  /** Closing meter reading by meter id (only for a running period). */
  readings: Record<string, number>;
  billed: IBilledLine[];
  extraCharges: { title: string; amount: number }[];
  /** Translated title of the deposit refund line. */
  depositLabel: string;
}): ISettlement {
  const { period, terminatedAt: t } = input;
  // closing invoice
  const invoice: { title: string; amount: number }[] = [];
  if (period.status === "active") {
    for (const u of period.usages) {
      if (u.usageBase !== "meter" || !u.meterId) continue;
      const closing = input.readings[u.meterId];
      if (closing === undefined) continue;
      const quantity = Math.max(0, closing - (u.openingReading?.value ?? 0));
      invoice.push({ title: `${u.serviceName} ${quantity}`, amount: usageCost({ quantity, price: u.price }).amount });
    }
  }
  for (const e of input.extraCharges) invoice.push(e);
  const charged = invoice.reduce((s, i) => s + i.amount, 0);

  // refund lines (suggested)
  const room = new Map<string, number>();
  for (const b of input.billed) room.set(b.invoiceId, Math.max(0, b.invoicePaid - b.invoiceRefunded));
  const order = { rent: 0, service: 1, deposit: 2 } as const;
  const lines: ISettlementLine[] = [];
  for (const b of [...input.billed].sort((a, c) => order[a.role] - order[c.role])) {
    const lineRoom = b.amount - b.refunded;
    const { unused: days, total } = b.role === "deposit" ? { unused: 0, total: 0 } : unused(b, period, t);
    const suggested = b.role === "deposit" ? b.amount : days > 0 ? prorate(b.amount, days, total) : 0;
    const invoiceRoom = room.get(b.invoiceId) ?? 0;
    const gross = Math.min(suggested, lineRoom);
    if (gross <= 0) continue;
    const cap = Math.min(gross, invoiceRoom);
    room.set(b.invoiceId, invoiceRoom - cap);
    lines.push({ key: keyOf(b), title: b.role === "deposit" ? input.depositLabel : b.title, gross, net: gross, cap });
  }

  // what is owed is taken from the deposit, then rent, then services
  let left = Math.max(charged, 0);
  for (const l of [...lines].sort((a, b) => rank(a.key) - rank(b.key))) {
    const take = Math.min(left, l.gross);
    left -= take;
    l.net = l.gross - take;
  }
  return { invoice, charged, refund: lines };
}
