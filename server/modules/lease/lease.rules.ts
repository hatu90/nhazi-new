import type { IRentVersion, LeaseStatus } from "./lease.schema";

/** Pure domain rules (no I/O) shared by the lease usecases. Dates are `YYYY-MM-DD`. */
export const today = (now = new Date()) => now.toISOString().slice(0, 10);

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
