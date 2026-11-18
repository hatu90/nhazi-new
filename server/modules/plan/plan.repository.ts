import type { IMySubscriptionResponse, IPlanResponse } from "./plan.schema";

export interface IPlanRepository {
  listPlans(): Promise<IPlanResponse[]>;
  /** The subscription of the account that covers `today` (YYYY-MM-DD), if any. */
  findCurrentSubscription(accountId: string, today: string): Promise<IMySubscriptionResponse | null>;
}
