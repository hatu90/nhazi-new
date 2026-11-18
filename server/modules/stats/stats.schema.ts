/** Numbers for the property dashboard. "This month" is the current calendar month (UTC). */
export interface IPropertyStatsResponse {
  requests: {
    /** maintenance requests still open or in progress */
    maintenanceOpen: number;
    /** tenants asking to end their lease, still open or in progress */
    closeLeaseOpen: number;
  };
  payments: {
    /** confirmed payments dated this month */
    collectedThisMonth: number;
    /** tenant-reported payments waiting for an admin to confirm */
    awaitingConfirmation: number;
  };
  invoices: {
    /** pending / partial invoices past their due date */
    overdue: number;
    /** invoices (not cancelled) due this month */
    dueThisMonth: number;
  };
}
