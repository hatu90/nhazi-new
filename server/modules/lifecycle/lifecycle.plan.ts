/**
 * Pure planning: invoice lines, overrides and refund / credit suggestions. No I/O, so it is testable and the
 * numbers come from the same calculator the frontend runs (lib/billing/pricing).
 */
import { daysInclusive, prorate, suggestAmount, usageCost } from "@/lib/billing/pricing";
import { ConflictError, ValidationError } from "@/server/shared/errors";
import type { IPlannedUsage } from "../billing/billing.plan";
import type { IBilledLine, INewRefundPlan, IPeriodUsage } from "./lifecycle.repository";
import type { IExtraItem, IPlanItem, IPlanLine } from "./lifecycle.schema";

const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const label = (a: string, b: string) => `${dmy(a)}–${dmy(b)}`;

// ── invoice lines (suggestions) ─────────────────────────────────────────────────────
export const depositLine = (amount: number): IPlanLine => ({ key: "deposit", kind: "deposit", title: "Deposit", amount, detail: null });

/** Rent of a period: the monthly rent prorated by the billing months the period covers. */
export const rentLine = (monthly: number, start: string, end: string): IPlanLine => ({
  key: "rent",
  kind: "rent",
  title: `Rent ${label(start, end)}`,
  amount: suggestAmount(monthly, start, end),
  detail: null,
});

/** Non-meter service billed in advance: its monthly cost prorated over the days it is live in the period. */
export const advanceLine = (u: IPlannedUsage, period: "new"): IPlanLine => {
  const quantity = u.quantity ?? 0;
  const calculated = usageCost({ quantity, price: u.price }).amount;
  return {
    key: `service:${u.subscriptionId}`,
    kind: "service",
    title: `${u.serviceName} ${label(u.from, u.to)}`,
    amount: suggestAmount(calculated, u.from, u.to),
    usage: { subscriptionId: u.subscriptionId, period },
    detail: { quantity, price: u.price, calculatedAmount: calculated, from: u.from, to: u.to },
  };
};

/** Meter usage billed in arrears: exactly quantity × frozen price. */
export const meterLine = (u: IPeriodUsage, quantity: number, period: "closed"): IPlanLine => {
  const calculated = usageCost({ quantity, price: u.price }).amount;
  return {
    key: `meter:${u.subscriptionId}`,
    kind: "meter",
    title: `${u.serviceName} ${quantity}`,
    amount: calculated,
    usage: { subscriptionId: u.subscriptionId, period },
    detail: { quantity, price: u.price, calculatedAmount: calculated },
  };
};

// ── overrides ───────────────────────────────────────────────────────────────────────
/** Apply the admin's typed amounts to the suggestions, add their extra lines, and drop the keys. */
export function finalize(lines: IPlanLine[], overrides: Record<string, number>, extra: IExtraItem[] = [], allowedExtraKeys: string[] = []): IPlanItem[] {
  const keys = new Set([...lines.map((l) => l.key), ...allowedExtraKeys]);
  for (const k of Object.keys(overrides)) {
    if (!keys.has(k)) throw new ValidationError("Unknown line in overrides", { fieldErrors: { overrides: [`Unknown line "${k}". Available: ${[...keys].join(", ") || "none"}`] } });
  }
  const items: IPlanItem[] = lines.map(({ key, ...l }) => ({ ...l, amount: overrides[key] ?? l.amount }));
  for (const e of extra) items.push({ kind: e.kind, title: e.title, amount: e.amount, detail: null });
  if (items.reduce((s, i) => s + i.amount, 0) < 0) {
    throw new ValidationError("Invoice total cannot be negative", { fieldErrors: { overrides: ["Credits exceed the charges: lower a credit or settle it as a refund"] } });
  }
  return items;
}

export const amountOf = (items: IPlanItem[], kind: IPlanItem["kind"]) => items.find((i) => i.kind === kind)?.amount;

// ── unused days of a billed line ────────────────────────────────────────────────────
const addOne = (d: string) => new Date(Date.parse(d + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10);
/** Days of a line left after `endsOn` (the new last day), out of the days it covers. Lines carry their own window; rent covers the period. */
function unusedOf(b: IBilledLine, period: { start: string; plannedEnd: string }, endsOn: string): { unused: number; total: number } {
  const from = b.window?.from ?? period.start;
  const to = b.window?.to ?? period.plannedEnd;
  if (endsOn >= to) return { unused: 0, total: daysInclusive(from, to) };
  const first = addOne(endsOn) > from ? addOne(endsOn) : from;
  return { unused: daysInclusive(first, to), total: daysInclusive(from, to) };
}

// ── credit for a period that ends early (advance already invoiced) ───────────────────
/** Negative lines for the unused days of rent / services that were billed for the full planned period. */
export function creditLines(billed: IBilledLine[], start: string, plannedEnd: string, newEnd: string): IPlanLine[] {
  const out: IPlanLine[] = [];
  for (const b of billed) {
    if (b.role === "deposit" || b.amount <= 0) continue;
    const { unused, total } = unusedOf(b, { start, plannedEnd }, newEnd);
    const credit = unused > 0 ? prorate(b.amount, unused, total) : 0;
    if (credit <= 0) continue;
    out.push({
      key: b.role === "rent" ? "credit:rent" : `credit:service:${b.subscriptionId}`,
      kind: "credit",
      title: `Credit: ${b.title} (${unused}/${total} days unused)`,
      amount: -credit,
      detail: null,
    });
  }
  return out;
}

// ── refund (prefilled; admin may type another amount within the limits) ──────────────
/**
 * Unused rent + unused non-meter services of the last period, and the deposit.
 * Suggestions never exceed the line's charge nor what was actually paid on its invoice (money goes back where it came from);
 * a typed override is validated against the same limits.
 */
export function planRefund(
  billed: IBilledLine[],
  period: { start: string; plannedEnd: string; terminatedAt: string; id: string },
  overrides: Record<string, number>,
  opts: { method?: "cash" | "bank_transfer"; note?: string },
  /** false: size the lines from what was charged only (the value held), ignoring what was paid */
  capByPaid = true,
): { refund: INewRefundPlan | null; keys: string[]; itemKeys: string[] } {
  const room = new Map<string, number>(); // what each invoice can still give back
  for (const b of billed) room.set(b.invoiceId, Math.max(0, b.invoicePaid - b.invoiceRefunded));

  const order: Record<IBilledLine["role"], number> = { rent: 0, service: 1, deposit: 2 };
  const keys: string[] = [];
  const items: INewRefundPlan["items"] = [];
  const itemKeys: string[] = [];
  for (const b of [...billed].sort((a, c) => order[a.role] - order[c.role])) {
    const key = b.role === "rent" ? "refund:rent" : b.role === "deposit" ? "refund:deposit" : `refund:service:${b.subscriptionId}`;
    keys.push(key);
    const lineRoom = b.amount - b.refunded;
    const { unused: unusedDays, total: totalDays } = b.role === "deposit" ? { unused: 0, total: 0 } : unusedOf(b, period, period.terminatedAt);
    const suggested = b.role === "deposit" ? b.amount : unusedDays > 0 ? prorate(b.amount, unusedDays, totalDays) : 0;
    const typed = overrides[key];
    const invoiceRoom = capByPaid ? (room.get(b.invoiceId) ?? 0) : Number.POSITIVE_INFINITY;
    let amount: number;
    if (typed !== undefined) {
      if (typed > lineRoom) throw new ConflictError(`${key}: exceeds what is left on the invoice line (${lineRoom})`, "REFUND_EXCEEDS_CHARGE");
      if (typed > invoiceRoom) throw new ConflictError(`${key}: exceeds what is still refundable from what was paid on the invoice (${invoiceRoom})`, "REFUND_EXCEEDS_PAID");
      amount = typed;
    } else {
      amount = Math.min(suggested, lineRoom, invoiceRoom);
    }
    if (amount <= 0) continue;
    room.set(b.invoiceId, invoiceRoom - amount);
    itemKeys.push(key);
    const partial = b.role !== "deposit";
    items.push({
      invoiceId: b.invoiceId,
      invoiceItemId: b.invoiceItemId,
      kind: b.role === "deposit" ? "deposit" : b.role === "rent" ? "unused_rent" : "unused_service",
      title: b.role === "deposit" ? "Deposit" : b.title,
      chargedAmount: b.amount,
      ...(partial && { unusedDays, totalDays }),
      amount,
    });
  }
  for (const k of Object.keys(overrides)) {
    if (k.startsWith("refund:") && !keys.includes(k)) throw new ValidationError("Unknown refund line", { fieldErrors: { overrides: [`Unknown line "${k}". Available: ${keys.join(", ") || "none"}`] } });
  }
  return { refund: items.length ? { billingPeriodId: period.id, ...opts, items } : null, keys, itemKeys };
}
