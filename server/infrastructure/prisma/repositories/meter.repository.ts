import type { IMeterRepository } from "@/server/modules/meter/meter.repository";
import type { ICreateMeterCommand, IMeterListQuery, IMeterResponse, IUpdateMeterCommand } from "@/server/modules/meter/meter.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDateOrNull, numOrNull } from "../mappers";

const include = { unit: { select: { unitName: true } }, service: { select: { serviceName: true } } } satisfies Prisma.MeterInclude;
type Row = Prisma.MeterGetPayload<{ include: typeof include }>;
const day = (v: string | null | undefined) => (v == null ? v : new Date(v));

const toMeter = (r: Row): IMeterResponse => ({
  id: r.id,
  propertyId: r.propertyId,
  unitId: r.unitId,
  unitName: r.unit.unitName,
  serviceId: r.serviceId,
  serviceName: r.service.serviceName,
  name: r.meterName,
  serialNumber: r.serialNumber,
  installedAt: isoDateOrNull(r.installedAt),
  removedAt: isoDateOrNull(r.removedAt),
  maxValue: numOrNull(r.maxValue),
  description: r.description,
});

export class PrismaMeterRepository implements IMeterRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: IMeterListQuery) {
    const where: Prisma.MeterWhereInput = {
      propertyId,
      deletedAt: null,
      ...(q.unitId && { unitId: q.unitId }),
      ...(q.serviceId && { serviceId: q.serviceId }),
      ...(q.inService !== undefined && { removedAt: q.inService ? null : { not: null } }),
    };
    const [rows, total] = await Promise.all([
      this.db.meter.findMany({ where, include, orderBy: [{ meterName: "asc" }, { id: "asc" }], ...toSkipTake(q) }),
      this.db.meter.count({ where }),
    ]);
    return paginated(rows.map(toMeter), total, q);
  }

  async findById(propertyId: string, meterId: string) {
    const r = await this.db.meter.findFirst({ where: { id: meterId, propertyId, deletedAt: null }, include });
    return r ? toMeter(r) : null;
  }

  async create(c: ICreateMeterCommand) {
    const r = await this.db.meter.create({
      data: {
        propertyId: c.propertyId,
        unitId: c.unitId,
        serviceId: c.serviceId,
        meterName: c.name,
        serialNumber: c.serialNumber,
        installedAt: day(c.installedAt),
        maxValue: c.maxValue,
        description: c.description,
      },
      include,
    });
    return toMeter(r);
  }

  async update(c: IUpdateMeterCommand) {
    if (!(await this.db.meter.count({ where: { id: c.meterId, propertyId: c.propertyId, deletedAt: null } }))) return null;
    const r = await this.db.meter.update({
      where: { id: c.meterId },
      data: {
        meterName: c.name,
        serialNumber: c.serialNumber,
        installedAt: day(c.installedAt),
        removedAt: day(c.removedAt),
        maxValue: c.maxValue,
        description: c.description,
      },
      include,
    });
    return toMeter(r);
  }

  async unitExists(propertyId: string, unitId: string) {
    return (await this.db.unit.count({ where: { id: unitId, propertyId, deletedAt: null } })) > 0;
  }

  async findServiceUsageBase(propertyId: string, serviceId: string) {
    const s = await this.db.service.findFirst({ where: { id: serviceId, propertyId, deletedAt: null }, select: { usageBase: true } });
    return s?.usageBase ?? null;
  }

  async isInUse(meterId: string) {
    const [r, s] = await Promise.all([
      this.db.reading.count({ where: { meterId, deletedAt: null } }),
      this.db.serviceSubscription.count({ where: { meterId, deletedAt: null } }),
    ]);
    return r + s > 0;
  }

  async softDelete(propertyId: string, meterId: string) {
    return (await this.db.meter.updateMany({ where: { id: meterId, propertyId, deletedAt: null }, data: { deletedAt: new Date() } })).count > 0;
  }
}
