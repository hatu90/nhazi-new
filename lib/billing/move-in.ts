/**
 * The move-in invoice a lease starts with: deposit, the first period's rent and the non-meter services billed in advance.
 * Pure (no I/O): the browser calculates it and sends the amounts as `overrides`, the server uses the same rules.
 * Meter services are billed in arrears and never appear here.
 */
import { computeCost, resolvePriceVersion, suggestAmount, type IPriceVersion } from "./pricing";

export interface IMoveInLease {
  startDate: string;
  depositAmount: number;
  rentVersions: { effectiveDate: string; amount: number }[];
  members: { joinedAt: string; leftAt: string | null }[];
  subscriptions: { id: string; serviceId: string; serviceName: string; usageBase: "lease" | "device" | "member" | "meter"; quantity: number; startDate: string; endDate: string | null }[];
}
export interface IMoveInLine {
  /** Matches the server's line keys: deposit · rent · service:<subscriptionId>. */
  key: string;
  kind: "deposit" | "rent" | "service";
  title: string;
  amount: number;
}
export interface IMoveIn {
  lines: IMoveInLine[];
  total: number;
  /** Why the invoice cannot be calculated (e.g. no rent or price in force). */
  error: string | null;
}

const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const range = (a: string, b: string) => `${dmy(a)}–${dmy(b)}`;
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);
const earliestAfter = <T extends { effectiveDate: string }>(versions: T[], on: string): T | null =>
  versions.filter((v) => v.effectiveDate > on).sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1))[0] ?? null;

/** `start`/`end`: the first billing period. `prices`: service id -> its price versions. */
export function planMoveIn(lease: IMoveInLease, prices: Record<string, IPriceVersion[]>, start: string, end: string): IMoveIn {
  const fail = (error: string): IMoveIn => ({ lines: [], total: 0, error });
  if (!start || !end || end < start) return fail("Choose where the first billing period ends");

  // A draft that starts on another day: what began with the lease follows it.
  const shift = (d: string) => (d === lease.startDate || d < start ? start : d);
  const rents = lease.rentVersions.map((v) => ({ ...v, effectiveDate: v.effectiveDate === lease.startDate ? start : v.effectiveDate }));
  const monthly = resolvePriceVersion(rents, start)?.amount ?? earliestAfter(rents, start)?.amount;
  if (monthly === undefined) return fail("The lease has no rent in force on its start date");

  const lines: IMoveInLine[] = [];
  lines.push({ key: "rent", kind: "rent", title: `Rent ${range(start, end)}`, amount: suggestAmount(monthly, start, end) });

  for (const s of lease.subscriptions) {
    if (s.usageBase === "meter") continue;
    const subStart = shift(s.startDate);
    if (subStart > end || (s.endDate && s.endDate < start)) continue; // not live in this period
    const price = resolvePriceVersion(prices[s.serviceId] ?? [], start) ?? earliestAfter(prices[s.serviceId] ?? [], start);
    if (!price) return fail(`${s.serviceName} has no price in force on ${start}`);
    const from = max(start, subStart);
    const to = s.endDate ? min(end, s.endDate) : end;
    const quantity =
      s.usageBase === "device" ? s.quantity : s.usageBase === "member" ? lease.members.filter((m) => shift(m.joinedAt) <= from && (m.leftAt === null || m.leftAt > from)).length : 1;
    const calculated = computeCost(price.tiers, quantity).amount;
    lines.push({ key: `service:${s.id}`, kind: "service", title: `${s.serviceName} ${range(from, to)}`, amount: suggestAmount(calculated, from, to) });
  }
  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0), error: null };
}
