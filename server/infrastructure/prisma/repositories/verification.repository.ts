import type { IVerificationRepository } from "@/server/modules/verification/verification.repository";
import type {
  ICreateCriterionPayload,
  ICriterionResponse,
  IDeclarationResponse,
  IDeclareCommand,
  IReviewCommand,
  IVerificationResultResponse,
  IReviewListQuery,
  IUpdateCriterionCommand,
  VerificationStatus,
} from "@/server/modules/verification/verification.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";
import { isoDateTime } from "../mappers";
import { deriveStatus } from "@/server/modules/verification/verification.rules";

const criterionSelect = { id: true, name: true, nameEn: true, description: true, descriptionEn: true, required: true, active: true, sortOrder: true } as const;
const declarationSelect = { id: true, status: true, note: true, reviewNote: true, declaredAt: true, reviewedAt: true, validityYears: true, expiresAt: true } as const;
const catalogOrder = [{ sortOrder: "asc" }, { createdAt: "asc" }] satisfies Prisma.VerificationCriterionOrderByWithRelationInput[];

const toDeclaration = (r: { id: string; status: IDeclarationResponse["status"]; note: string | null; reviewNote: string | null; declaredAt: Date; reviewedAt: Date | null; validityYears: number | null; expiresAt: Date | null }): IDeclarationResponse => ({
  id: r.id,
  status: r.status,
  note: r.note,
  reviewNote: r.reviewNote,
  declaredAt: isoDateTime(r.declaredAt),
  reviewedAt: r.reviewedAt ? isoDateTime(r.reviewedAt) : null,
  validityYears: r.validityYears,
  expiresAt: r.expiresAt ? isoDateTime(r.expiresAt) : null,
});

export class PrismaVerificationRepository implements IVerificationRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Keeps `property_verification_results` in step with the declarations (one property, or all when omitted).
   * A property is verified when there is at least one active required criterion and each has a live (unexpired) confirmation.
   *  - verified, no open result      -> open one (snapshotting the criteria it was earned with)
   *  - verified, open result         -> refresh its expiry / snapshot if they changed (e.g. a renewal)
   *  - not verified, open result     -> close it: `expired` if its term ran out, else `no_longer_met`
   * Returns how many results were opened, changed or closed.
   */
  private async recompute(db: Prisma.TransactionClient, propertyId?: string): Promise<number> {
    const now = new Date();
    const required = await db.verificationCriterion.findMany({ where: { active: true, required: true }, select: { id: true, name: true, nameEn: true } });
    const open = await db.propertyVerificationResult.findMany({ where: { endedAt: null, ...(propertyId && { propertyId }) } });
    const live = await db.propertyVerification.findMany({
      where: { status: "confirmed", expiresAt: { gt: now }, criterionId: { in: required.map((r) => r.id) }, ...(propertyId && { propertyId }) },
      select: { propertyId: true, criterionId: true, validityYears: true, expiresAt: true, reviewedAt: true, reviewedBy: true },
    });
    const byProperty = new Map<string, typeof live>();
    for (const v of live) byProperty.set(v.propertyId, [...(byProperty.get(v.propertyId) ?? []), v]);
    const openBy = new Map(open.map((o) => [o.propertyId, o]));

    let changed = 0;
    for (const id of new Set([...byProperty.keys(), ...openBy.keys()])) {
      const rows = byProperty.get(id) ?? [];
      const current = openBy.get(id);
      const verified = required.length > 0 && required.every((r) => rows.some((v) => v.criterionId === r.id));
      if (!verified) {
        if (!current) continue;
        await db.propertyVerificationResult.update({ where: { id: current.id }, data: { endedAt: now, endReason: current.expiresAt <= now ? "expired" : "no_longer_met" } });
        changed++;
        continue;
      }
      const used = required.map((r) => ({ r, v: rows.find((x) => x.criterionId === r.id)! }));
      const expiresAt = new Date(Math.min(...used.map(({ v }) => v.expiresAt!.getTime())));
      const criteria = used.map(({ r, v }) => ({ criterionId: r.id, name: r.name, nameEn: r.nameEn, years: v.validityYears ?? 0, confirmedAt: isoDateTime(v.reviewedAt ?? now), expiresAt: isoDateTime(v.expiresAt!) }));
      const last = used.map(({ v }) => v).sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))[0];
      if (!current) {
        await db.propertyVerificationResult.create({ data: { propertyId: id, expiresAt, criteria, confirmedBy: last.reviewedBy } });
        changed++;
      } else if (current.expiresAt.getTime() !== expiresAt.getTime() || JSON.stringify(current.criteria) !== JSON.stringify(criteria)) {
        await db.propertyVerificationResult.update({ where: { id: current.id }, data: { expiresAt, criteria, confirmedBy: last.reviewedBy } });
        changed++;
      }
    }
    return changed;
  }

  /** Status as everyone sees it, from the open result and the declarations. */
  private async statusOf(db: Prisma.TransactionClient | PrismaClient, propertyId: string) {
    const [open, declaration] = await Promise.all([
      db.propertyVerificationResult.findFirst({ where: { propertyId, endedAt: null }, select: { expiresAt: true } }),
      db.propertyVerification.findFirst({ where: { propertyId, status: { in: ["declared", "confirmed"] }, criterion: { active: true } }, select: { id: true } }),
    ]);
    return { status: deriveStatus(open?.expiresAt ?? null, declaration !== null), expiresAt: open?.expiresAt ?? null };
  }

  refreshExpired() {
    return this.db.$transaction((tx) => this.recompute(tx));
  }

  listCriteria({ activeOnly }: { activeOnly: boolean }): Promise<ICriterionResponse[]> {
    return this.db.verificationCriterion.findMany({ where: activeOnly ? { active: true } : {}, select: criterionSelect, orderBy: catalogOrder });
  }

  createCriterion(payload: ICreateCriterionPayload): Promise<ICriterionResponse> {
    return this.db.$transaction(async (tx) => {
      const created = await tx.verificationCriterion.create({ data: payload, select: criterionSelect });
      await this.recompute(tx); // a new required criterion un-verifies everyone
      return created;
    });
  }

  async updateCriterion(command: IUpdateCriterionCommand): Promise<ICriterionResponse | null> {
    const { criterionId, actor: _, ...data } = command;
    return this.db.$transaction(async (tx) => {
      if (!(await tx.verificationCriterion.findUnique({ where: { id: criterionId }, select: { id: true } }))) return null;
      const updated = await tx.verificationCriterion.update({ where: { id: criterionId }, data, select: criterionSelect });
      await this.recompute(tx);
      return updated;
    });
  }

  async deleteCriterion(criterionId: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.verificationCriterion.deleteMany({ where: { id: criterionId } });
      if (count === 0) return false;
      await this.recompute(tx);
      return true;
    });
  }

  async getForProperty(propertyId: string) {
    const [state, criteria, declarations, results] = await Promise.all([
      this.statusOf(this.db, propertyId),
      this.listCriteria({ activeOnly: true }),
      this.db.propertyVerification.findMany({ where: { propertyId }, select: { criterionId: true, ...declarationSelect } }),
      this.db.propertyVerificationResult.findMany({ where: { propertyId }, orderBy: { verifiedAt: "desc" } }),
    ]);
    const byCriterion = new Map(declarations.map((d) => [d.criterionId, d]));
    return {
      status: state.status,
      expiresAt: state.status === "verified" && state.expiresAt ? isoDateTime(state.expiresAt) : null,
      history: results.map((r) => ({
        id: r.id,
        verifiedAt: isoDateTime(r.verifiedAt),
        expiresAt: isoDateTime(r.expiresAt),
        endedAt: r.endedAt ? isoDateTime(r.endedAt) : null,
        endReason: r.endReason,
        criteria: r.criteria as IVerificationResultResponse["criteria"],
      })),
      criteria: criteria.map((criterion) => {
        const d = byCriterion.get(criterion.id);
        return { criterion, declaration: d ? toDeclaration(d) : null };
      }),
    };
  }

  async declare({ propertyId, criterionId, note }: IDeclareCommand): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      if (!(await tx.verificationCriterion.findFirst({ where: { id: criterionId, active: true }, select: { id: true } }))) return false;
      const reset = { status: "declared", note, reviewNote: null, declaredAt: new Date(), reviewedAt: null, reviewedBy: null, validityYears: null, expiresAt: null } as const;
      await tx.propertyVerification.upsert({
        where: { propertyId_criterionId: { propertyId, criterionId } },
        create: { propertyId, criterionId, ...reset },
        update: reset,
      });
      await this.recompute(tx, propertyId);
      return true;
    });
  }

  async withdraw(propertyId: string, criterionId: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.propertyVerification.deleteMany({ where: { propertyId, criterionId } });
      if (count === 0) return false;
      await this.recompute(tx, propertyId);
      return true;
    });
  }

  async listReviews(query: IReviewListQuery) {
    const where: Prisma.PropertyVerificationWhereInput = { status: query.status, property: { deletedAt: null }, criterion: { active: true } };
    const [rows, total] = await Promise.all([
      this.db.propertyVerification.findMany({
        where,
        select: {
          ...declarationSelect,
          property: { select: { id: true, propertyName: true, street: true } },
          criterion: { select: criterionSelect },
        },
        orderBy: { declaredAt: "asc" },
        ...toSkipTake(query),
      }),
      this.db.propertyVerification.count({ where }),
    ]);
    return paginated(
      rows.map((r) => ({ ...toDeclaration(r), property: { id: r.property.id, name: r.property.propertyName, street: r.property.street }, criterion: r.criterion })),
      total,
      query,
    );
  }

  async review({ actor, verificationId, decision, reviewNote, years }: IReviewCommand): Promise<{ propertyId: string; status: VerificationStatus } | null> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.propertyVerification.findUnique({ where: { id: verificationId }, select: { propertyId: true } });
      if (!existing) return null;
      const now = new Date();
      const expiresAt = decision === "confirmed" && years ? new Date(new Date(now).setFullYear(now.getFullYear() + years)) : null;
      await tx.propertyVerification.update({
        where: { id: verificationId },
        data: { status: decision, reviewNote: decision === "rejected" ? reviewNote : null, reviewedAt: now, reviewedBy: actor.accountId, validityYears: decision === "confirmed" ? (years ?? null) : null, expiresAt },
      });
      await this.recompute(tx, existing.propertyId);
      const { status } = await this.statusOf(tx, existing.propertyId);
      return { propertyId: existing.propertyId, status };
    });
  }
}
