import type { ICriterionResponse, IDeclareAllCommand, IPropertyVerificationResponse, IReviewCommand, IReviewItemResponse, IReviewListQuery, ICreateCriterionPayload, IUpdateCriterionCommand, VerificationStatus } from "./verification.schema";
import type { IPaginated } from "@/server/shared/pagination";

export interface IVerificationRepository {
  // catalog
  listCriteria(opts: { activeOnly: boolean }): Promise<ICriterionResponse[]>;
  createCriterion(payload: ICreateCriterionPayload): Promise<ICriterionResponse>;
  /** Null when the criterion does not exist. Re-derives every property's status. */
  updateCriterion(command: IUpdateCriterionCommand): Promise<ICriterionResponse | null>;
  deleteCriterion(criterionId: string): Promise<boolean>;
  // per property
  getForProperty(propertyId: string): Promise<IPropertyVerificationResponse>;
  /** Declares the chosen active criteria that are not yet declared, were rejected, or are expired / close to expiry (a renewal), in one transaction. Pending and confirmed ones are left alone. Returns how many were raised. */
  declareAll(command: IDeclareAllCommand): Promise<number>;
  withdraw(propertyId: string, criterionId: string): Promise<boolean>;
  /** Re-derives the status of every property (confirmations that expired no longer count). Returns the number of statuses that changed. */
  refreshExpired(): Promise<number>;
  // staff review
  listReviews(query: IReviewListQuery): Promise<IPaginated<IReviewItemResponse>>;
  /** Null when the declaration does not exist. Returns the property's new status. */
  review(command: IReviewCommand): Promise<{ propertyId: string; status: VerificationStatus } | null>;
}
