import type { IRentVersion, LeaseStatus } from "./lease.schema";

/** Pure domain rules (no I/O) shared by the lease usecases. Dates are `YYYY-MM-DD`. */
/** Business timezone: the calendar day a landlord and tenant mean by "today" (UTC would be a day behind from 00:00 to 07:00). */
export const BUSINESS_TZ = "Asia/Ho_Chi_Minh";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const today = (now = new Date()) => dayFmt.format(now);

/** Latest rent version whose effectiveDate <= `on`; null when none applies yet. */
export const resolveRent = (versions: IRentVersion[], on: string): number | null => {
  let best: IRentVersion | null = null;
  for (const v of versions) {
    if (v.effectiveDate <= on && (!best || v.effectiveDate > best.effectiveDate)) best = v;
  }
  return best ? best.amount : null;
};

export const resolveLeaseStatus = (
  lease: { startDate: string; endDate: string | null; terminatedAt: string | null; activatedAt?: string | null },
  on: string,
): LeaseStatus => {
  if (lease.activatedAt === null) return "draft";
  // a lease that was ended is ended from then on, even while its (earlier chosen) last day is today or later
  if (lease.terminatedAt !== null) return "ended";
  if (lease.startDate > on) return "upcoming";
  return lease.endDate !== null && lease.endDate < on ? "ended" : "active";
};
