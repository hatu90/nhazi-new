import type { IActor } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import type { AccessPolicy } from "../access/access.policy";
import type { IFeedbackRepository } from "./feedback.repository";
import type { IAnswerFeedbackCommand, ICreateFeedbackCommand, IFeedbackListQuery, IFeedbackListResponse, IFeedbackResponse } from "./feedback.schema";

/** Public: anyone can read the feedbacks and their answers. */
export class ListFeedbacksUseCase implements IUseCase<IFeedbackListQuery, IFeedbackListResponse> {
  constructor(private readonly feedbacks: IFeedbackRepository) {}
  execute(query: IFeedbackListQuery) {
    return this.feedbacks.list(query);
  }
}

/** Public: anyone can leave feedback. */
export class CreateFeedbackUseCase implements IUseCase<ICreateFeedbackCommand, IFeedbackResponse> {
  constructor(private readonly feedbacks: IFeedbackRepository) {}
  execute(command: ICreateFeedbackCommand) {
    return this.feedbacks.create(command);
  }
}

/** Super admin only. */
export class AnswerFeedbackUseCase implements IUseCase<IAnswerFeedbackCommand, IFeedbackResponse> {
  constructor(private readonly feedbacks: IFeedbackRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, feedbackId, answer }: IAnswerFeedbackCommand) {
    await this.policy.assertSuperAdmin(actor);
    const updated = await this.feedbacks.answer(feedbackId, answer, actor.accountId);
    if (!updated) throw new NotFoundError("Feedback");
    return updated;
  }
}

/** Super admin only: how to reach the author. */
export class GetFeedbackContactUseCase implements IUseCase<{ actor: IActor; feedbackId: string }, { contact: string }> {
  constructor(private readonly feedbacks: IFeedbackRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, feedbackId }: { actor: IActor; feedbackId: string }) {
    await this.policy.assertSuperAdmin(actor);
    const contact = await this.feedbacks.findContact(feedbackId);
    if (contact === null) throw new NotFoundError("Feedback");
    return { contact };
  }
}
