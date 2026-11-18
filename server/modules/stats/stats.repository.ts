import type { IPropertyStatsResponse } from "./stats.schema";

export interface IStatsRepository {
  forProperty(propertyId: string, on: Date): Promise<IPropertyStatsResponse>;
}
