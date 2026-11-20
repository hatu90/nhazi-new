import type { IReadingRepository } from "@/server/modules/reading/reading.repository";
import type { ICreateReadingCommand, IReadingListQuery, IReadingResponse } from "@/server/modules/reading/reading.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDate, isoDateOrNull, isoDateTime, num, numOrNull, orConflict } from "../mappers";

const toReading = (r: Prisma.ReadingGetPayload<object>): IReadingResponse => ({
  id: r.id,
  meterId: r.meterId,
  readOn: isoDate(r.readOn),
  readAt: isoDateTime(r.readAt),
  value: num(r.readingValue),
  readBy: r.readBy,
  createdAt: isoDateTime(r.createdAt),
});

export class PrismaReadingRepository implements IReadingRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMeter(propertyId: string, meterId: string) {
    const m = await this.db.meter.findFirst({
      where: { id: meterId, propertyId, deletedAt: null },
      select: { id: true, removedAt: true, maxValue: true },
    });
    return m && { id: m.id, removedAt: isoDateOrNull(m.removedAt), maxValue: numOrNull(m.maxValue) };
  }

  async list(meterId: string, q: IReadingListQuery) {
    const where: Prisma.ReadingWhereInput = {
      meterId,
      deletedAt: null,
      ...((q.from || q.to) && { readOn: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } }),
    };
    const [rows, total] = await Promise.all([
      this.db.reading.findMany({ where, orderBy: { readAt: "desc" }, ...toSkipTake(q) }),
      this.db.reading.count({ where }),
    ]);
    return paginated(rows.map(toReading), total, q);
  }

  async neighbours(meterId: string, readAt: string) {
    const d = new Date(readAt);
    const [prev, next] = await Promise.all([
      this.db.reading.findFirst({ where: { meterId, deletedAt: null, readAt: { lt: d } }, orderBy: { readAt: "desc" } }),
      this.db.reading.findFirst({ where: { meterId, deletedAt: null, readAt: { gt: d } }, orderBy: { readAt: "asc" } }),
    ]);
    const n = (r: typeof prev) => (r ? { readOn: isoDate(r.readOn), readAt: isoDateTime(r.readAt), value: num(r.readingValue) } : null);
    return { prev: n(prev), next: n(next) };
  }

  create(c: ICreateReadingCommand) {
    return orConflict(
      async () =>
        toReading(
          await this.db.reading.create({
            data: { propertyId: c.propertyId, meterId: c.meterId, readOn: new Date(c.readOn), readAt: new Date(c.readAt), readingValue: c.value, readBy: c.actor.accountId },
          }),
        ),
      "This meter already has a reading at that moment",
      "READING_EXISTS",
    );
  }

  async findById(meterId: string, readingId: string) {
    const r = await this.db.reading.findFirst({ where: { id: readingId, meterId, deletedAt: null } });
    return r ? toReading(r) : null;
  }

  async isBilled(readingId: string) {
    return (await this.db.usage.count({ where: { OR: [{ openingReadingId: readingId }, { closingReadingId: readingId }] } })) > 0;
  }

  async softDelete(meterId: string, readingId: string) {
    return (await this.db.reading.updateMany({ where: { id: readingId, meterId, deletedAt: null }, data: { deletedAt: new Date() } })).count > 0;
  }
}
