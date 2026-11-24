import type { IAccessRepository } from "@/server/modules/access/access.repository";
import { phoneSchema, type PropertyRole } from "@/server/shared/schema";
import type { PrismaClient } from "../client";

/** `SUPER_ADMIN_PHONE` normalised like every stored phone number (E.164). */
export const superAdminPhone = (): string | null => {
  const parsed = phoneSchema.safeParse(process.env.SUPER_ADMIN_PHONE ?? "");
  return parsed.success ? parsed.data : null;
};

export class PrismaAccessRepository implements IAccessRepository {
  constructor(private readonly db: PrismaClient) {}

  async isPlatformAdmin(accountId: string): Promise<boolean> {
    const row = await this.db.account.findFirst({ where: { id: accountId, deletedAt: null, status: "active" }, select: { isPlatformAdmin: true } });
    return row?.isPlatformAdmin ?? false;
  }

  async isSuperAdmin(accountId: string): Promise<boolean> {
    const phone = superAdminPhone();
    if (!phone) return false; // closed while SUPER_ADMIN_PHONE is not configured
    return (await this.db.account.count({ where: { id: accountId, phoneNumber: phone, deletedAt: null, status: "active" } })) > 0;
  }

  async findPropertyRole(accountId: string, propertyId: string): Promise<PropertyRole | null> {
    const row = await this.db.accountProperty.findFirst({
      where: { accountId, propertyId, property: { deletedAt: null } },
      select: { role: true },
    });
    return row?.role ?? null;
  }
}
