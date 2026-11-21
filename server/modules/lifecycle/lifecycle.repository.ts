import type { IPriceVersion } from "@/lib/billing/pricing";
import type { IActor } from "@/server/shared/actor";
import type { ServiceUsageBase } from "@/server/shared/schema";
import type { INewPeriod, IOpenContext } from "../billing/billing.repository";
import type { IClosePlan, IInvoicePlan } from "./lifecycle.schema";

export interface IReadingWrite {
  meterId: string;
  on: string;
  value: number;
}

export interface IPeriodUsage {
  id: string;
  subscriptionId: string;
  serviceName: string;
  usageBase: ServiceUsageBase;
  meterId: string | null;
  subscriptionEndDate: string | null;
  quantity: number | null;
  price: IPriceVersion;
  /** Meter usages: the value of the opening reading. */
  openingValue: number | null;
}
export interface IActivePeriod {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  usages: IPeriodUsage[];
}
export interface ILifecycleContext extends IOpenContext {
  active: IActivePeriod | null;
}

/** An invoice line that may have to be credited / refunded, with what was paid and already given back. */
export interface IBilledLine {
  invoiceId: string;
  invoiceItemId: string;
  role: "rent" | "deposit" | "service";
  /** service lines: whose usage it is */
  subscriptionId: string | null;
  title: string;
  /** The days the line covers (advance service lines); null = the whole period. */
  window: { from: string; to: string } | null;
  /** charged on the line */
  amount: number;
  refunded: number;
  invoicePaid: number;
  invoiceRefunded: number;
}

export interface INewRefundPlan {
  billingPeriodId: string | null;
  method?: "cash" | "bank_transfer";
  note?: string;
  items: {
    invoiceId: string;
    invoiceItemId?: string;
    kind: "deposit" | "unused_rent" | "unused_service" | "other";
    title: string;
    chargedAmount: number;
    unusedDays?: number;
    totalDays?: number;
    amount: number;
  }[];
}

interface IBase {
  propertyId: string;
  leaseId: string;
  actor: IActor;
  readings: IReadingWrite[];
}
export interface IStartPlan extends IBase {
  /** The draft's start date moves: everything that began on `from` (first rent, services, members) follows. */
  moveStart?: { from: string; to: string };
  period: INewPeriod;
  invoice: IInvoicePlan;
}
export interface IRolloverPlan extends IBase {
  close: IClosePlan;
  next: INewPeriod | null;
  invoice: IInvoicePlan | null;
}
export interface ICloseLeasePlan extends IBase {
  terminatedAt: string;
  reason?: string;
  close: IClosePlan | null;
  invoice: IInvoicePlan | null;
  refund: INewRefundPlan | null;
  handovers: { handoverId: string; condition: "good" | "damaged" | "missing"; quantity: number; note?: string }[];
}
export interface ISubscriptionPlan extends IBase {
  subscription: {
    serviceId: string;
    meterId?: string;
    quantity: number;
    details?: string;
    startDate: string;
    endDate?: string;
  };
  /** Created in the running period when the subscription is live in it. */
  usage: { periodId: string; opening: { meterId: string; on: string } | null; quantity: number | null; price: IPriceVersion } | null;
  /** A non-meter service billed for the rest of the running period (kind other, no period). */
  invoice: { kind: IInvoicePlan["kind"]; title: string; dueDate: string; items: IInvoicePlan["items"] } | null;
}

export interface ILifecycleRepository {
  /** The lease a period belongs to (null = no such period in the property). */
  leaseOfPeriod(propertyId: string, periodId: string): Promise<string | null>;
  /** Lease + subscriptions + members + the running period (if any). */
  load(propertyId: string, leaseId: string): Promise<ILifecycleContext | null>;
  findReading(meterId: string, on: string): Promise<{ value: number } | null>;
  /** The latest reading of the meter on or before `on`, else the nearest one after it. */
  findLastReading(meterId: string, on: string): Promise<{ value: number; on: string } | null>;
  /** Does another lease of the unit overlap [start, end]? */
  hasOverlap(unitId: string, start: string, end: string | null, excludeLeaseId: string): Promise<boolean>;
  /** Name, base and price history of a service of the property. */
  findServicePrices(propertyId: string, serviceId: string): Promise<{ name: string; usageBase: ServiceUsageBase; prices: IPriceVersion[] } | null>;
  /** Rent / service lines of one period and the deposit lines of the lease, with paid + refunded totals. Cancelled invoices excluded. */
  billedLines(propertyId: string, leaseId: string, periodId: string): Promise<IBilledLine[]>;

  /** Each apply* is ONE transaction. */
  applyStart(plan: IStartPlan): Promise<{ periodId: string; invoiceId: string }>;
  applyRollover(plan: IRolloverPlan): Promise<{ nextPeriodId: string | null; invoiceId: string | null }>;
  applyClose(plan: ICloseLeasePlan): Promise<{ invoiceId: string | null; refundId: string | null }>;
  applySubscription(plan: ISubscriptionPlan): Promise<{ subscriptionId: string; usageId: string | null; invoiceId: string | null }>;
}
