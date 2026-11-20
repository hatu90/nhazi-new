import type { ITenancyDetailResponse } from "@/client/lib/types";

export type Handover = ITenancyDetailResponse["handovers"][number];

/** One row per person: the household members, plus tenants who are not (yet) listed as a member. */
export type PersonRow = { id: string; name: string; phoneNumber: string | null; yearOfBirth: number | null; joinedAt: string | null; leftAt: string | null; tenant: boolean };

export function peopleOf(l: ITenancyDetailResponse): PersonRow[] {
  const tenantPhones = new Set(l.tenants.map((t) => t.phoneNumber));
  const memberPhones = new Set(l.members.map((m) => m.phoneNumber));
  const members = l.members.map((m) => ({ ...m, tenant: m.phoneNumber !== null && tenantPhones.has(m.phoneNumber) }));
  const tenantsOnly = l.tenants
    .filter((t) => !memberPhones.has(t.phoneNumber))
    .map((t) => ({ id: t.accountId, name: t.displayName, phoneNumber: t.phoneNumber, yearOfBirth: null, joinedAt: null, leftAt: null, tenant: true }));
  return [...tenantsOnly, ...members];
}
