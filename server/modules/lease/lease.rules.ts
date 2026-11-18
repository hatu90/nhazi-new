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
  if (lease.startDate > on) return "upcoming";
  const end = lease.terminatedAt ?? lease.endDate;
  return end !== null && end < on ? "ended" : "active";
};
