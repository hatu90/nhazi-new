import type { PropertyRole } from "@/server/shared/schema";
import type { INotificationResponse } from "./notification.schema";

export interface INotificationRepository {
  /** Open / in-progress requests on properties where the account holds one of `roles`. */
  openRequests(accountId: string, roles: readonly PropertyRole[], limit: number): Promise<INotificationResponse[]>;
  /** Tenant side: unpaid invoices on the account's active leases. */
  invoicesToPay(accountId: string, limit: number): Promise<INotificationResponse[]>;
  /** Landlord side: payments reported by tenants and waiting for review. */
  paymentsToConfirm(accountId: string, roles: readonly PropertyRole[], limit: number): Promise<INotificationResponse[]>;
}
