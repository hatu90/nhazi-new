import type { IDashboardResponse } from "./dashboard.schema";

export interface IDashboardRepository {
  forAccount(accountId: string, on: Date): Promise<IDashboardResponse>;
}
