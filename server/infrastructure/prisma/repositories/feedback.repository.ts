import type { IFeedbackRepository } from "@/server/modules/feedback/feedback.repository";
import type { ICreateFeedbackCommand, IFeedbackListQuery, IFeedbackResponse } from "@/server/modules/feedback/feedback.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDateTime } from "../mappers";

// `contact` is left out on purpose: it never leaves the repository except through `findContact`.
const select = { id: true, authorName: true, category: true, message: true, answer: true, answeredAt: true, createdAt: true } as const;
type Row = Prisma.FeedbackGetPayload<{ select: typeof select }>;

const toResponse = (r: Row): IFeedbackResponse => ({
  id: r.id,
  authorName: r.authorName,
  category: r.category,
  message: r.message,
  answer: r.answer,
  answeredAt: r.answeredAt ? isoDateTime(r.answeredAt) : null,
  createdAt: isoDateTime(r.createdAt),
});

export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(query: IFeedbackListQuery) {
    const where: Prisma.FeedbackWhereInput = query.category ? { category: query.category } : {};
    const [rows, total] = await Promise.all([
      this.db.feedback.findMany({ where, select, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...toSkipTake(query) }),
      this.db.feedback.count({ where }),
    ]);
    return paginated(rows.map(toResponse), total, query);
  }

  async create(command: ICreateFeedbackCommand) {
    return toResponse(await this.db.feedback.create({ data: command, select }));
  }

  async answer(feedbackId: string, answer: string, answeredById: string) {
    try {
      return toResponse(await this.db.feedback.update({ where: { id: feedbackId }, data: { answer, answeredAt: new Date(), answeredById }, select }));
    } catch (err) {
      if ((err as { code?: string }).code === "P2025") return null; // record not found
      throw err;
    }
  }

  async findContact(feedbackId: string) {
    const row = await this.db.feedback.findUnique({ where: { id: feedbackId }, select: { contact: true } });
    return row?.contact ?? null;
  }
}
