import type { IStatsRepository } from "@/server/modules/stats/stats.repository";
import type { IPropertyStatsResponse } from "@/server/modules/stats/stats.schema";
import type { PrismaClient } from "../client";
import { num } from "../mappers";

export class PrismaStatsRepository implements IStatsRepository {
  constructor(private readonly db: PrismaClient) {}

  async forProperty(propertyId: string, on: Date): Promise<IPropertyStatsResponse> {
    const today = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));
    const monthStart = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth() + 1, 1));
    const openRequest = (type: "maintenance" | "close_lease") => ({ propertyId, type, deletedAt: null, status: { in: ["open", "in_progress"] as ("open" | "in_progress")[] } });
    const payment = { deletedAt: null, invoice: { propertyId, deletedAt: null } };
    const live = { propertyId, deletedAt: null, status: { not: "cancelled" as const } };

    const [maintenanceOpen, closeLeaseOpen, collected, awaiting, overdue, dueThisMonth] = await Promise.all([
      this.db.request.count({ where: openRequest("maintenance") }),
      this.db.request.count({ where: openRequest("close_lease") }),
      this.db.payment.aggregate({ _sum: { amount: true }, where: { ...payment, status: "confirmed", paidOn: { gte: monthStart, lt: nextMonth } } }),
      this.db.payment.count({ where: { ...payment, status: "pending" } }),
      this.db.invoice.count({ where: { ...live, status: { in: ["pending", "partial"] }, dueDate: { lt: today } } }),
      this.db.invoice.count({ where: { ...live, dueDate: { gte: monthStart, lt: nextMonth } } }),
    ]);
    return {
      requests: { maintenanceOpen, closeLeaseOpen },
      payments: { collectedThisMonth: collected._sum.amount ? num(collected._sum.amount) : 0, awaitingConfirmation: awaiting },
      invoices: { overdue, dueThisMonth },
    };
  }
}
