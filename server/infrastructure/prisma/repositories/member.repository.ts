import type { IMemberRepository } from "@/server/modules/member/member.repository";
import type { IMemberResponse } from "@/server/modules/member/member.schema";
import type { PropertyRole } from "@/server/shared/schema";
import type { Prisma, PrismaClient } from "../client";
import { orConflict } from "../mappers";

const include = { account: { select: { id: true, displayName: true, phoneNumber: true } } } satisfies Prisma.AccountPropertyInclude;
const toMember = (r: Prisma.AccountPropertyGetPayload<{ include: typeof include }>): IMemberResponse => ({
  accountId: r.account.id,
  displayName: r.account.displayName,
  phoneNumber: r.account.phoneNumber,
  role: r.role,
});

export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string) {
    const rows = await this.db.accountProperty.findMany({ where: { propertyId, account: { deletedAt: null } }, include, orderBy: { createdAt: "asc" } });
    return rows.map(toMember);
  }
  async find(propertyId: string, accountId: string) {
    const r = await this.db.accountProperty.findUnique({ where: { propertyId_accountId: { propertyId, accountId } }, include });
    return r ? toMember(r) : null;
  }
  async findAccountIdByPhone(phoneNumber: string) {
    const a = await this.db.account.findFirst({ where: { phoneNumber, deletedAt: null }, select: { id: true } });
    return a?.id ?? null;
  }
  countOwners(propertyId: string) {
    return this.db.accountProperty.count({ where: { propertyId, role: "owner" } });
  }
  add(propertyId: string, accountId: string, role: PropertyRole) {
    return orConflict(
      async () => toMember(await this.db.accountProperty.create({ data: { propertyId, accountId, role }, include })),
      "This account is already a member",
      "ALREADY_MEMBER",
    );
  }
  async setRole(propertyId: string, accountId: string, role: PropertyRole) {
    return toMember(await this.db.accountProperty.update({ where: { propertyId_accountId: { propertyId, accountId } }, data: { role }, include }));
  }
  async remove(propertyId: string, accountId: string) {
    await this.db.accountProperty.delete({ where: { propertyId_accountId: { propertyId, accountId } } });
  }
}
