import type { IAccountRepository } from "@/server/modules/identity/identity.repository";
import type {
  IAccountResponse,
  IMeResponse,
  IRegisterCommand,
  IUpdateMeCommand,
} from "@/server/modules/identity/identity.schema";
import type { AuthProvider } from "@/server/shared/auth";
import type { PrismaClient } from "../client";
import { ConflictError } from "@/server/shared/errors";
import { isoDateTime, orConflict } from "../mappers";

const accountSelect = { id: true, phoneNumber: true, displayName: true, status: true, createdAt: true } as const;

const toAccount = (r: { id: string; phoneNumber: string; displayName: string; status: IAccountResponse["status"]; createdAt: Date }): IAccountResponse => ({
  id: r.id,
  phoneNumber: r.phoneNumber,
  displayName: r.displayName,
  status: r.status,
  createdAt: isoDateTime(r.createdAt),
});

export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAccountIdByIdentity(provider: AuthProvider, providerUserId: string) {
    const row = await this.db.authIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      select: { account: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (!row || row.account.deletedAt) return null;
    return { id: row.account.id, active: row.account.status === "active" };
  }

  createWithIdentity(command: IRegisterCommand): Promise<IAccountResponse> {
    const { identity } = command;
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const existing = await tx.account.findFirst({
            where: { phoneNumber: command.phoneNumber, deletedAt: null },
            select: { id: true, _count: { select: { authIdentities: true } } },
          });
          if (existing) {
            // Placeholder created by a landlord (tenant added by phone): claimable only with a *verified* matching phone.
            if (existing._count.authIdentities > 0 || identity.phoneNumber !== command.phoneNumber) {
              throw new ConflictError("Phone number is already registered", "ACCOUNT_EXISTS");
            }
            return toAccount(
              await tx.account.update({
                where: { id: existing.id },
                data: {
                  displayName: command.displayName,
                  authIdentities: { create: { provider: identity.provider, providerUserId: identity.providerUserId } },
                },
                select: accountSelect,
              }),
            );
          }
          return toAccount(
            await tx.account.create({
              data: {
                phoneNumber: command.phoneNumber,
                displayName: command.displayName,
                authIdentities: { create: { provider: identity.provider, providerUserId: identity.providerUserId } },
              },
              select: accountSelect,
            }),
          );
        }),
      "Phone number or login is already registered",
      "ACCOUNT_EXISTS",
    );
  }

  async findMe(accountId: string): Promise<IMeResponse | null> {
    const row = await this.db.account.findFirst({
      where: { id: accountId, deletedAt: null },
      select: {
        ...accountSelect,
        accountProperties: {
          where: { property: { deletedAt: null } },
          select: { role: true, property: { select: { id: true, propertyName: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { accountLeases: { where: { lease: { deletedAt: null } } } } },
      },
    });
    if (!row) return null;
    return {
      ...toAccount(row),
      properties: row.accountProperties.map((m) => ({ propertyId: m.property.id, propertyName: m.property.propertyName, role: m.role })),
      leaseCount: row._count.accountLeases,
    };
  }

  async updateProfile({ actor, displayName }: IUpdateMeCommand): Promise<IAccountResponse> {
    const row = await this.db.account.update({
      where: { id: actor.accountId },
      data: { ...(displayName !== undefined && { displayName }) },
      select: accountSelect,
    });
    return toAccount(row);
  }
}
