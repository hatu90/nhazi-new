import type { IActor } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES } from "../access/access.policy";
import type { INotificationRepository } from "./notification.repository";
import type { INotificationListResponse } from "./notification.schema";

const LIMIT = 50;

/** Requests to handle, invoices to pay and payments to confirm for the caller, newest first. */
export class ListMyNotificationsUseCase implements IUseCase<{ actor: IActor }, INotificationListResponse> {
  constructor(private readonly notifications: INotificationRepository) {}

  async execute({ actor }: { actor: IActor }) {
    const [requests, invoices, payments] = await Promise.all([
      this.notifications.openRequests(actor.accountId, ROLES.field, LIMIT),
      this.notifications.invoicesToPay(actor.accountId, LIMIT),
      this.notifications.paymentsToConfirm(actor.accountId, ROLES.manage, LIMIT),
    ]);
    const items = [...payments, ...invoices, ...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIMIT);
    return { items };
  }
}
