import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IPaginated } from "@/server/shared/pagination";
import type { ServiceUsageBase } from "@/server/shared/schema";
import type { IRentVersion } from "../lease/lease.schema";
import type { IBillingPeriodDetailRecord, IBillingPeriodListQuery, IBillingPeriodResponse } from "./billing.schema";

/** Everything the usecase needs to open the next period of a lease. */
export interface IOpenContext {
  lease: {
    id: string;
    unitId: string;
    startDate: string;
    endDate: string | null;
    terminatedAt: string | null;
    /** null = draft */
    activatedAt: string | null;
    firstPeriodEnd: string | null;
    depositAmount: number;
    rentVersions: IRentVersion[];
    /** A lease cannot end before someone moved in. */
    lastMemberJoinedAt: string | null;
  };
  lastPeriod: { id: string; startDate: string; endDate: string; status: "active" | "closed"; rentAmount: number } | null;
  subscriptions: {
    id: string;
    quantity: number;
    startDate: string;
    endDate: string | null;
    meterId: string | null;
    service: { name: string; usageBase: ServiceUsageBase; prices: IPriceVersion[] };
  }[];
  members: { joinedAt: string; leftAt: string | null }[];
}
export interface INewUsage {
  subscriptionId: string;
  /** Meter usages: the reading (meter + date) the usage starts from; resolved to a row when stored. */
  opening: { meterId: string; on: string } | null;
  quantity: number | null;
  price: IPriceVersion;
}
export interface INewPeriod {
  propertyId: string;
  leaseId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  usages: INewUsage[];
}
export interface IReadingPoint {
  id: string;
  value: number;
}

export interface IBillingRepository {
  list(propertyId: string, query: IBillingPeriodListQuery): Promise<IPaginated<IBillingPeriodResponse>>;
  findById(propertyId: string, periodId: string): Promise<IBillingPeriodDetailRecord | null>;

  getOpenContext(propertyId: string, leaseId: string): Promise<IOpenContext | null>;
  findReading(meterId: string, on: string): Promise<IReadingPoint | null>;
  /** Period + usages in one transaction. ConflictError PERIOD_ACTIVE / PERIOD_OVERLAP. Returns the new id. */
  createPeriod(c: INewPeriod): Promise<string>;

  findUsage(propertyId: string, periodId: string, usageId: string): Promise<{ usageBase: ServiceUsageBase; billed: boolean; periodStatus: "active" | "closed" } | null>;
  setUsageQuantity(usageId: string, quantity: number): Promise<void>;
}
