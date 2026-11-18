import type { IPropertyScope } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IStatsRepository } from "./stats.repository";
import type { IPropertyStatsResponse } from "./stats.schema";

export class GetPropertyStatsUseCase implements IUseCase<IPropertyScope, IPropertyStatsResponse> {
  constructor(private readonly stats: IStatsRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId }: IPropertyScope) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.stats.forProperty(propertyId, new Date());
  }
}
