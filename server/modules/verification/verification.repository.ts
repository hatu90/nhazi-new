import type { ICriterionResponse, IDeclareCommand, IPropertyVerificationResponse, IReviewCommand, IReviewItemResponse, IReviewListQuery, ICreateCriterionPayload, IUpdateCriterionCommand, VerificationStatus } from "./verification.schema";
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
  /** False when the criterion does not exist or is inactive. Creates or resets the declaration to `declared`. */
  declare(command: IDeclareCommand): Promise<boolean>;
  withdraw(propertyId: string, criterionId: string): Promise<boolean>;
  /** Re-derives the status of every property (confirmations that expired no longer count). Returns the number of statuses that changed. */
  refreshExpired(): Promise<number>;
  // staff review
  listReviews(query: IReviewListQuery): Promise<IPaginated<IReviewItemResponse>>;
  /** Null when the declaration does not exist. Returns the property's new status. */
  review(command: IReviewCommand): Promise<{ propertyId: string; status: VerificationStatus } | null>;
}
