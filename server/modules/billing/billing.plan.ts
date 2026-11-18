import { resolvePriceVersion } from "@/lib/billing/pricing";
import { ConflictError } from "@/server/shared/errors";
import type { INewUsage, IOpenContext } from "./billing.repository";

/** Pure planning for a billing period. Reads are injected so callers can overlay readings that are not stored yet. */
export type IReadingAt = (meterId: string, on: string) => Promise<{ value: number } | null>;

export interface IPlannedUsage extends INewUsage {
  serviceName: string;
  usageBase: IOpenContext["subscriptions"][number]["service"]["usageBase"];
  /** The days of the period this subscription is live: max(period start, sub start) .. min(period end, sub end). */
  from: string;
  to: string;
}

const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

/** Headcount of the lease members on a date. */
export const headcountOn = (members: IOpenContext["members"], on: string) => members.filter((m) => m.joinedAt <= on && (m.leftAt === null || m.leftAt > on)).length;

/**
 * One usage per live subscription, with:
 *  - the FROZEN price: the version in force on the period's first day
 *  - meter  : opening reading (meter + date); quantity unknown until the period closes
 *  - lease  : 1 · device : the subscribed count · member : headcount on the first live day
 */
export async function planUsages(ctx: IOpenContext, start: string, end: string, readingAt: IReadingAt): Promise<IPlannedUsage[]> {
  const out: IPlannedUsage[] = [];
  for (const sub of ctx.subscriptions) {
    if (sub.startDate > end || (sub.endDate && sub.endDate < start)) continue; // not live in this period
    const price = resolvePriceVersion(sub.service.prices, start);
    if (!price) throw new ConflictError(`${sub.service.name} has no price in force on ${start}`, "PRICE_NOT_IN_FORCE");
    const from = max(start, sub.startDate);
    const to = sub.endDate ? min(end, sub.endDate) : end;
    const base = { subscriptionId: sub.id, price, serviceName: sub.service.name, usageBase: sub.service.usageBase, from, to };
    if (sub.service.usageBase === "meter") {
      const opening = sub.meterId ? await readingAt(sub.meterId, from) : null;
      if (!sub.meterId || !opening) throw new ConflictError(`${sub.service.name} needs a meter reading on ${from}`, "MISSING_READING");
      out.push({ ...base, opening: { meterId: sub.meterId, on: from }, quantity: null });
      continue;
    }
    const quantity = sub.service.usageBase === "device" ? sub.quantity : sub.service.usageBase === "member" ? headcountOn(ctx.members, from) : 1;
    out.push({ ...base, opening: null, quantity });
  }
  return out;
}
