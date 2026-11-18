export type PlanCycle = "monthly" | "yearly";
export interface IPlanResponse {
  id: string;
  name: string;
  price: number;
  description: string | null;
  cycle: PlanCycle;
  features: unknown;
}
export interface IMySubscriptionResponse {
  id: string;
  plan: IPlanResponse;
  startDate: string;
  endDate: string | null;
  currentPeriod: { startDate: string; endDate: string; status: "active" | "expired" } | null;
}
