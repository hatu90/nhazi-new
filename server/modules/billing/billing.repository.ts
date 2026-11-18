import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IPaginated } from "@/server/shared/pagination";
import type { ServiceUsageBase } from "@/server/shared/schema";
import type { IRentVersion } from "../lease/lease.schema";
import type { IBillingPeriodDetailRecord, IBillingPeriodListQuery, IBillingPeriodResponse } from "./billing.schema";

/** Everything the usecase needs to open the next period of a lease. */
export interface IOpenContext {
  lease: { startDate: string; endDate: string | null; terminatedAt: string | null; rentVersions: IRentVersion[] };
  lastPeriod: { endDate: string; status: "active" | "closed" } | null;
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
  openingReadingId: string | null;
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
export interface ICloseContext {
  period: { id: string; leaseId: string; status: "active" | "closed"; startDate: string; endDate: string };
  meterUsages: {
    id: string;
    serviceName: string;
    meterId: string;
    subscriptionEndDate: string | null;
    openingValue: number;
  }[];
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

  getCloseContext(propertyId: string, periodId: string): Promise<ICloseContext | null>;
  /** Sets closing readings + quantities and the status, only while the period is active. false = it was not. */
  closePeriod(periodId: string, closings: { usageId: string; closingReadingId: string; quantity: number }[]): Promise<boolean>;

  findUsage(propertyId: string, periodId: string, usageId: string): Promise<{ usageBase: ServiceUsageBase; billed: boolean; periodStatus: "active" | "closed" } | null>;
  setUsageQuantity(usageId: string, quantity: number): Promise<void>;
}
