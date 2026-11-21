import type { INotificationRepository } from "@/server/modules/notification/notification.repository";
import type { INotificationResponse } from "@/server/modules/notification/notification.schema";
import type { PropertyRole } from "@/server/shared/schema";
import type { PrismaClient } from "../client";
import { isoDate, isoDateTime, num } from "../mappers";

const vnd = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} ₫`;
const member = (accountId: string, roles: readonly PropertyRole[]) => ({ deletedAt: null, accountProperties: { some: { accountId, role: { in: [...roles] } } } });

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async openRequests(accountId: string, roles: readonly PropertyRole[], limit: number): Promise<INotificationResponse[]> {
    const rows = await this.db.request.findMany({
      where: { deletedAt: null, status: { in: ["open", "in_progress"] }, property: member(accountId, roles) },
      select: {
        id: true, propertyId: true, title: true, status: true, createdAt: true,
        property: { select: { propertyName: true } },
        unit: { select: { unitName: true } },
        requestedByRef: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: `request:${r.id}`,
      kind: "request",
      title: r.title,
      description: `${r.requestedByRef.displayName} · ${r.property.propertyName}${r.unit ? ` · ${r.unit.unitName}` : ""} · ${r.status === "open" ? "Open" : "In progress"}`,
      area: "admin",
      path: `/properties/${r.propertyId}/requests/${r.id}`,
      createdAt: isoDateTime(r.createdAt),
    }));
  }

  async invoicesToPay(accountId: string, limit: number): Promise<INotificationResponse[]> {
    const rows = await this.db.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: ["pending", "partial"] },
        lease: { deletedAt: null, accountLeases: { some: { accountId } } },
      },
      select: {
        id: true, leaseId: true, title: true, amount: true, dueDate: true, createdAt: true,
        property: { select: { propertyName: true } },
        lease: { select: { unit: { select: { unitName: true } } } },
        payments: { where: { status: "confirmed", deletedAt: null }, select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => {
      const left = num(r.amount) - r.payments.reduce((s, p) => s + num(p.amount), 0);
      return {
        id: `invoice:${r.id}`,
        kind: "invoice",
        title: r.title,
        description: `${vnd(left)} due ${isoDate(r.dueDate)} · ${r.property.propertyName} · ${r.lease.unit.unitName}`,
        area: "dashboard",
        path: `/leases/${r.leaseId}/invoices/${r.id}`,
        createdAt: isoDateTime(r.createdAt),
      };
    });
  }

  async paymentsToConfirm(accountId: string, roles: readonly PropertyRole[], limit: number): Promise<INotificationResponse[]> {
    const rows = await this.db.payment.findMany({
      where: { deletedAt: null, status: "pending", invoice: { deletedAt: null, property: member(accountId, roles) } },
      select: {
        id: true, amount: true, createdAt: true,
        createdByRef: { select: { displayName: true } },
        invoice: { select: { id: true, propertyId: true, title: true, property: { select: { propertyName: true } }, lease: { select: { unit: { select: { unitName: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((p) => ({
      id: `payment:${p.id}`,
      kind: "payment",
      title: `Confirm payment of ${vnd(num(p.amount))}`,
      description: `${p.createdByRef.displayName} paid “${p.invoice.title}” · ${p.invoice.property.propertyName} · ${p.invoice.lease.unit.unitName}`,
      area: "admin",
      path: `/properties/${p.invoice.propertyId}/invoices/${p.invoice.id}`,
      createdAt: isoDateTime(p.createdAt),
    }));
  }
}
