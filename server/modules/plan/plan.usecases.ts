import type { IActor } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import { today } from "../lease/lease.rules";
import type { IPlanRepository } from "./plan.repository";
import type { IMySubscriptionResponse, IPlanResponse } from "./plan.schema";

export class ListPlansUseCase implements IUseCase<void, IPlanResponse[]> {
  constructor(private readonly plans: IPlanRepository) {}
  execute() {
    return this.plans.listPlans();
  }
}
export class GetMySubscriptionUseCase implements IUseCase<IActor, IMySubscriptionResponse | null> {
  constructor(private readonly plans: IPlanRepository) {}
  execute(actor: IActor) {
    return this.plans.findCurrentSubscription(actor.accountId, today());
  }
}
