import type { IUnitRepository } from "@/server/modules/unit/unit.repository";
import type { IBulkUnitsCommand, ICreateUnitCommand, IUnitListQuery, IUnitResponse, IUpdateUnitCommand } from "@/server/modules/unit/unit.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { num, numOrNull, orConflict } from "../mappers";

type UnitRow = Prisma.UnitGetPayload<object>;

export const toUnit = (u: UnitRow): IUnitResponse => ({
  id: u.id,
  propertyId: u.propertyId,
  name: u.unitName,
  area: num(u.area),
  floor: u.floor,
  bathrooms: u.bathrooms,
  bedrooms: u.bedrooms,
  rentPrice: numOrNull(u.rentPrice),
  rentNegotiable: u.rentNegotiable,
  description: u.description,
});

const NAME_TAKEN = ["A unit with this name already exists in the property", "UNIT_NAME_TAKEN"] as const;

export class PrismaUnitRepository implements IUnitRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, query: IUnitListQuery) {
    const where: Prisma.UnitWhereInput = {
      propertyId,
      deletedAt: null,
      ...(query.q && { unitName: { contains: query.q, mode: "insensitive" } }),
    };
    const [rows, total] = await Promise.all([
      this.db.unit.findMany({ where, orderBy: [{ floor: "asc" }, { unitName: "asc" }], ...toSkipTake(query) }),
      this.db.unit.count({ where }),
    ]);
    return paginated(rows.map(toUnit), total, query);
  }

  async findById(propertyId: string, unitId: string) {
    const row = await this.db.unit.findFirst({ where: { id: unitId, propertyId, deletedAt: null } });
    return row ? toUnit(row) : null;
  }

  createMany(c: IBulkUnitsCommand) {
    return orConflict(
      () =>
        this.db.unit
          .createManyAndReturn({
            data: c.items.map((u) => ({
              propertyId: c.propertyId,
              unitName: u.name,
              area: u.area,
              floor: u.floor,
              bathrooms: u.bathrooms,
              bedrooms: u.bedrooms,
              rentPrice: u.rentPrice,
              rentNegotiable: u.rentNegotiable,
              description: u.description,
            })),
          })
          .then((rows) => rows.map(toUnit)),
      ...NAME_TAKEN,
    );
  }

  create(c: ICreateUnitCommand) {
    return orConflict(
      async () =>
        toUnit(
          await this.db.unit.create({
            data: {
              propertyId: c.propertyId,
              unitName: c.name,
              area: c.area,
              floor: c.floor,
              bathrooms: c.bathrooms,
              bedrooms: c.bedrooms,
              rentPrice: c.rentPrice,
              rentNegotiable: c.rentNegotiable,
              description: c.description,
            },
          }),
        ),
      ...NAME_TAKEN,
    );
  }

  async update(c: IUpdateUnitCommand) {
    const existing = await this.db.unit.findFirst({ where: { id: c.unitId, propertyId: c.propertyId, deletedAt: null }, select: { id: true } });
    if (!existing) return null;
    return orConflict(
      async () =>
        toUnit(
          await this.db.unit.update({
            where: { id: c.unitId },
            data: {
              unitName: c.name,
              area: c.area,
              floor: c.floor,
              bathrooms: c.bathrooms,
              bedrooms: c.bedrooms,
              rentPrice: c.rentPrice,
              rentNegotiable: c.rentNegotiable,
              description: c.description,
            },
          }),
        ),
      ...NAME_TAKEN,
    );
  }

  async hasLeases(unitId: string) {
    return (await this.db.lease.count({ where: { unitId, deletedAt: null } })) > 0;
  }

  async softDelete(propertyId: string, unitId: string) {
    const r = await this.db.unit.updateMany({ where: { id: unitId, propertyId, deletedAt: null }, data: { deletedAt: new Date() } });
    return r.count > 0;
  }
}
