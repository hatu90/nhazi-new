/** Home dashboard of an account: what it manages as a property member, and what it rents as a tenant. Dates are ISO `YYYY-MM-DD`. */

/** A running billing period whose end date has arrived (today >= endDate) but is not closed yet. */
export interface IDuePeriod {
  id: string;
  propertyId: string;
  propertyName: string;
  leaseId: string;
  unitName: string;
  startDate: string;
  endDate: string;
}

/** A pending / partial invoice past its due date. */
export interface IOverdueInvoice {
  id: string;
  propertyId: string;
  propertyName: string;
  leaseId: string;
  unitName: string;
  title: string;
  dueDate: string;
  /** invoice amount minus confirmed payments */
  outstanding: number;
}

/** A payment waiting for an admin to confirm. */
export interface IPendingPayment {
  id: string;
  invoiceId: string;
  propertyId: string;
  propertyName: string;
  leaseId: string;
  unitName: string;
  amount: number;
  paidOn: string;
}

export interface IOpenRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  unitName: string | null;
  type: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
}

/** `total` counts everything; `items` is the first few, most urgent first. */
export interface IDashboardList<T> {
  total: number;
  items: T[];
}

export interface IDashboardResponse {
  management: {
    properties: { total: number; units: number; occupiedUnits: number };
    periodsToClose: IDashboardList<IDuePeriod>;
    requests: IDashboardList<IOpenRequest> & { maintenance: number; closeLease: number };
    overdueInvoices: IDashboardList<IOverdueInvoice> & { outstanding: number };
    payments: IDashboardList<IPendingPayment> & { collectedThisMonth: number };
  };
  tenant: {
    leases: { total: number; active: number };
    periodsToClose: IDashboardList<IDuePeriod>;
    overdueInvoices: IDashboardList<IOverdueInvoice> & { outstanding: number };
    /** payments this account reported that nobody has confirmed yet */
    payments: IDashboardList<IPendingPayment> & { paidThisMonth: number };
  };
}
