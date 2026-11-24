import type { ICreateFeedbackCommand, IFeedbackListQuery, IFeedbackListResponse, IFeedbackResponse } from "./feedback.schema";

export interface IFeedbackRepository {
  list(query: IFeedbackListQuery): Promise<IFeedbackListResponse>;
  create(command: ICreateFeedbackCommand): Promise<IFeedbackResponse>;
  /** Null when the feedback does not exist. Answering again replaces the previous answer. */
  answer(feedbackId: string, answer: string, answeredById: string): Promise<IFeedbackResponse | null>;
  /** Null when the feedback does not exist. */
  findContact(feedbackId: string): Promise<string | null>;
}
