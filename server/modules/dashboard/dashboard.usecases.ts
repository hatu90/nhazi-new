import type { IActor } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import type { IDashboardRepository } from "./dashboard.repository";
import type { IDashboardResponse } from "./dashboard.schema";

export class GetMyDashboardUseCase implements IUseCase<IActor, IDashboardResponse> {
  constructor(private readonly dashboard: IDashboardRepository) {}
  async execute(actor: IActor) {
    return this.dashboard.forAccount(actor.accountId, new Date());
  }
}
