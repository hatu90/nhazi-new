import type { IAccessRepository } from "@/server/modules/access/access.repository";
import type { PropertyRole } from "@/server/shared/schema";
import type { PrismaClient } from "../client";

export class PrismaAccessRepository implements IAccessRepository {
  constructor(private readonly db: PrismaClient) {}

  async isPlatformAdmin(accountId: string): Promise<boolean> {
    const row = await this.db.account.findFirst({ where: { id: accountId, deletedAt: null, status: "active" }, select: { isPlatformAdmin: true } });
    return row?.isPlatformAdmin ?? false;
  }

  async findPropertyRole(accountId: string, propertyId: string): Promise<PropertyRole | null> {
    const row = await this.db.accountProperty.findFirst({
      where: { accountId, propertyId, property: { deletedAt: null } },
      select: { role: true },
    });
    return row?.role ?? null;
  }
}
