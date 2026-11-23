import type { IServiceRepository } from "@/server/modules/service/service.repository";
import {
  pricesSchema,
  type IBulkServicesCommand,
  type ICreateServiceCommand,
  type IPriceVersion,
  type IServiceListQuery,
  type IServiceResponse,
  type IUpdateServiceCommand,
} from "@/server/modules/service/service.schema";
import { ConflictError } from "@/server/shared/errors";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { orConflict } from "../mappers";

const toService = (r: Prisma.ServiceGetPayload<object>): IServiceResponse => ({
  id: r.id,
  propertyId: r.propertyId,
  name: r.serviceName,
  usageBase: r.usageBase,
  unitOfMeasure: r.unitOfMeasure,
  description: r.description,
  prices: pricesSchema.parse(r.prices),
});

const live = (propertyId: string, id?: string): Prisma.ServiceWhereInput => ({ propertyId, deletedAt: null, ...(id && { id }) });

export class PrismaServiceRepository implements IServiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, query: IServiceListQuery) {
    const where = { ...live(propertyId), ...(query.usageBase && { usageBase: query.usageBase }) };
    const [rows, total] = await Promise.all([
      this.db.service.findMany({ where, orderBy: [{ serviceName: "asc" }], ...toSkipTake(query) }),
      this.db.service.count({ where }),
    ]);
    return paginated(rows.map(toService), total, query);
  }

  async findById(propertyId: string, serviceId: string) {
    const r = await this.db.service.findFirst({ where: live(propertyId, serviceId) });
    return r ? toService(r) : null;
  }

  createMany(c: IBulkServicesCommand) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const out: IServiceResponse[] = [];
          for (const v of c.items) {
            out.push(
              toService(
                await tx.service.create({
                  data: { propertyId: c.propertyId, serviceName: v.name, usageBase: v.usageBase, unitOfMeasure: v.unitOfMeasure, description: v.description, prices: v.prices },
                }),
              ),
            );
          }
          return out;
        }),
      "A service with this name already exists in the property",
      "SERVICE_NAME_TAKEN",
    );
  }

  create(c: ICreateServiceCommand) {
    return orConflict(
      async () =>
        toService(
          await this.db.service.create({
            data: {
              propertyId: c.propertyId,
              serviceName: c.name,
              usageBase: c.usageBase,
              unitOfMeasure: c.unitOfMeasure,
              description: c.description,
              prices: c.prices,
            },
          }),
        ),
      "A service with this name already exists in the property",
      "SERVICE_NAME_TAKEN",
    );
  }

  async update(c: IUpdateServiceCommand) {
    if (!(await this.db.service.count({ where: live(c.propertyId, c.serviceId) }))) return null;
    return orConflict(
      async () =>
        toService(
          await this.db.service.update({
            where: { id: c.serviceId },
            data: { serviceName: c.name, unitOfMeasure: c.unitOfMeasure, description: c.description },
          }),
        ),
      "A service with this name already exists in the property",
      "SERVICE_NAME_TAKEN",
    );
  }

  async appendPrice(propertyId: string, serviceId: string, version: IPriceVersion) {
    const row = await this.db.service.findFirst({ where: live(propertyId, serviceId) });
    if (!row) return null;
    const prices = [...pricesSchema.parse(row.prices), version];
    // optimistic lock on updatedAt: a concurrent writer makes count 0
    const r = await this.db.service.updateMany({ where: { id: serviceId, updatedAt: row.updatedAt }, data: { prices } });
    if (r.count === 0) throw new ConflictError("The service was changed meanwhile, retry", "STALE_WRITE");
    return toService({ ...row, prices });
  }

  async replaceLatestPrice(propertyId: string, serviceId: string, tiers: IPriceVersion["tiers"]) {
    const row = await this.db.service.findFirst({ where: live(propertyId, serviceId) });
    if (!row) return null;
    const all = pricesSchema.parse(row.prices);
    const prices = [...all.slice(0, -1), { ...all[all.length - 1], tiers }];
    const r = await this.db.service.updateMany({ where: { id: serviceId, updatedAt: row.updatedAt }, data: { prices } });
    if (r.count === 0) throw new ConflictError("The service was changed meanwhile, retry", "STALE_WRITE");
    return toService({ ...row, prices });
  }

  async isInUse(serviceId: string) {
    const [m, s] = await Promise.all([
      this.db.meter.count({ where: { serviceId, deletedAt: null } }),
      this.db.serviceSubscription.count({ where: { serviceId, deletedAt: null } }),
    ]);
    return m + s > 0;
  }

  async softDelete(propertyId: string, serviceId: string) {
    return (await this.db.service.updateMany({ where: live(propertyId, serviceId), data: { deletedAt: new Date() } })).count > 0;
  }
}
