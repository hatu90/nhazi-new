import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IMemberRepository } from "./member.repository";
import type { IAddMemberCommand, IChangeMemberRoleCommand, IMemberResponse } from "./member.schema";

/** Team management is owner-only. The last owner can be neither demoted nor removed. */
abstract class Base {
  constructor(protected readonly members: IMemberRepository, protected readonly policy: AccessPolicy) {}
  protected async assertNotLastOwner(propertyId: string, accountId: string) {
    const m = await this.members.find(propertyId, accountId);
    if (!m) throw new NotFoundError("Member");
    if (m.role === "owner" && (await this.members.countOwners(propertyId)) <= 1) {
      throw new ConflictError("A property needs at least one owner", "LAST_OWNER");
    }
    return m;
  }
}

export class ListMembersUseCase extends Base implements IUseCase<IPropertyScope, IMemberResponse[]> {
  async execute({ actor, propertyId }: IPropertyScope) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.members.list(propertyId);
  }
}
export class AddMemberUseCase extends Base implements IUseCase<IAddMemberCommand, IMemberResponse> {
  async execute(c: IAddMemberCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.ownerOnly);
    const accountId = await this.members.findAccountIdByPhone(c.phoneNumber);
    if (!accountId) throw new NotFoundError("Account with this phone number");
    return this.members.add(c.propertyId, accountId, c.role);
  }
}
export class ChangeMemberRoleUseCase extends Base implements IUseCase<IChangeMemberRoleCommand, IMemberResponse> {
  async execute(c: IChangeMemberRoleCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.ownerOnly);
    if (c.role !== "owner") await this.assertNotLastOwner(c.propertyId, c.accountId);
    else if (!(await this.members.find(c.propertyId, c.accountId))) throw new NotFoundError("Member");
    return this.members.setRole(c.propertyId, c.accountId, c.role);
  }
}
export class RemoveMemberUseCase extends Base implements IUseCase<IPropertyScope & { accountId: string }, void> {
  async execute({ actor, propertyId, accountId }: IPropertyScope & { accountId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.ownerOnly);
    await this.assertNotLastOwner(propertyId, accountId);
    await this.members.remove(propertyId, accountId);
  }
}
