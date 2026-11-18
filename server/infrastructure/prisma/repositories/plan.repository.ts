import type { IPlanRepository } from "@/server/modules/plan/plan.repository";
import type { IPlanResponse } from "@/server/modules/plan/plan.schema";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateOrNull, num } from "../mappers";

const toPlan = (p: Prisma.PlanGetPayload<object>): IPlanResponse => ({
  id: p.id,
  name: p.planName,
  price: num(p.price),
  description: p.description,
  cycle: p.cycle,
  features: p.features,
});

export class PrismaPlanRepository implements IPlanRepository {
  constructor(private readonly db: PrismaClient) {}

  async listPlans() {
    return (await this.db.plan.findMany({ orderBy: [{ price: "asc" }, { planName: "asc" }] })).map(toPlan);
  }

  async findCurrentSubscription(accountId: string, today: string) {
    const t = new Date(today);
    const s = await this.db.accountSubscription.findFirst({
      where: { accountId, startDate: { lte: t }, OR: [{ endDate: null }, { endDate: { gte: t } }] },
      include: { plan: true, subscriptionPeriods: { where: { startDate: { lte: t }, endDate: { gte: t } }, take: 1 } },
      orderBy: { startDate: "desc" },
    });
    if (!s) return null;
    const p = s.subscriptionPeriods[0];
    return {
      id: s.id,
      plan: toPlan(s.plan),
      startDate: isoDate(s.startDate),
      endDate: isoDateOrNull(s.endDate),
      currentPeriod: p ? { startDate: isoDate(p.startDate), endDate: isoDate(p.endDate), status: p.status } : null,
    };
  }
}
