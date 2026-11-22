import type { IActor } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IVerificationRepository } from "./verification.repository";
import type {
  ICreateCriterionPayload,
  ICriterionResponse,
  IDeclareCommand,
  IPropertyVerificationResponse,
  IReviewCommand,
  IReviewListQuery,
  IReviewListResponse,
  IUpdateCriterionCommand,
  IWithdrawCommand,
  VerificationStatus,
} from "./verification.schema";

// ── owner side ──────────────────────────────────────────────────────────────────────
export class GetPropertyVerificationUseCase implements IUseCase<{ actor: IActor; propertyId: string }, IPropertyVerificationResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId }: { actor: IActor; propertyId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.verification.getForProperty(propertyId);
  }
}

/** Owner / admin says a criterion is met. Re-declaring (e.g. after a rejection or an edit) sends it back for review. */
export class DeclareCriterionUseCase implements IUseCase<IDeclareCommand, IPropertyVerificationResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute(c: IDeclareCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.verification.declare(c))) throw new NotFoundError("Criterion");
    return this.verification.getForProperty(c.propertyId);
  }
}

export class WithdrawCriterionUseCase implements IUseCase<IWithdrawCommand, IPropertyVerificationResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute(c: IWithdrawCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.verification.withdraw(c.propertyId, c.criterionId))) throw new NotFoundError("Declaration");
    return this.verification.getForProperty(c.propertyId);
  }
}

// ── platform staff ──────────────────────────────────────────────────────────────────
export class ListCriteriaUseCase implements IUseCase<IActor, ICriterionResponse[]> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute(actor: IActor) {
    await this.policy.assertPlatformAdmin(actor);
    return this.verification.listCriteria({ activeOnly: false });
  }
}

export class CreateCriterionUseCase implements IUseCase<{ actor: IActor; payload: ICreateCriterionPayload }, ICriterionResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, payload }: { actor: IActor; payload: ICreateCriterionPayload }) {
    await this.policy.assertPlatformAdmin(actor);
    return this.verification.createCriterion(payload);
  }
}

export class UpdateCriterionUseCase implements IUseCase<IUpdateCriterionCommand, ICriterionResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute(c: IUpdateCriterionCommand) {
    await this.policy.assertPlatformAdmin(c.actor);
    const updated = await this.verification.updateCriterion(c);
    if (!updated) throw new NotFoundError("Criterion");
    return updated;
  }
}

/** Removes the criterion and every declaration of it. Prefer deactivating it to keep history. */
export class DeleteCriterionUseCase implements IUseCase<{ actor: IActor; criterionId: string }, void> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, criterionId }: { actor: IActor; criterionId: string }) {
    await this.policy.assertPlatformAdmin(actor);
    if (!(await this.verification.deleteCriterion(criterionId))) throw new NotFoundError("Criterion");
  }
}

export class ListReviewsUseCase implements IUseCase<{ actor: IActor; query: IReviewListQuery }, IReviewListResponse> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, query }: { actor: IActor; query: IReviewListQuery }) {
    await this.policy.assertPlatformAdmin(actor);
    return this.verification.listReviews(query);
  }
}

export class ReviewDeclarationUseCase implements IUseCase<IReviewCommand, { propertyId: string; status: VerificationStatus }> {
  constructor(private readonly verification: IVerificationRepository, private readonly policy: AccessPolicy) {}
  async execute(c: IReviewCommand) {
    await this.policy.assertPlatformAdmin(c.actor);
    const result = await this.verification.review(c);
    if (!result) throw new NotFoundError("Declaration");
    return result;
  }
}

/** Daily job: properties whose confirmations lapsed lose `verified`. Returns how many statuses were re-derived. */
export class RefreshVerificationUseCase implements IUseCase<void, { refreshed: number }> {
  constructor(private readonly verification: IVerificationRepository) {}
  async execute() {
    return { refreshed: await this.verification.refreshExpired() };
  }
}
