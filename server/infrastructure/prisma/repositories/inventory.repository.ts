import type { IInventoryRepository } from "@/server/modules/inventory/inventory.repository";
import type {
  IBulkItemsCommand,
  ICreateHandoverCommand,
  ICreateItemCommand,
  IHandoverResponse,
  IItemListQuery,
  IItemResponse,
  IUpdateHandoverCommand,
  IUpdateItemCommand,
} from "@/server/modules/inventory/inventory.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { orConflict } from "../mappers";

const toItem = (r: Prisma.InventoryItemGetPayload<object>): IItemResponse => ({ id: r.id, propertyId: r.propertyId, name: r.inventoryName });
const include = { inventoryItem: { select: { inventoryName: true } } } satisfies Prisma.HandoverInclude;
const toHandover = (r: Prisma.HandoverGetPayload<{ include: typeof include }>): IHandoverResponse => ({
  id: r.id,
  unitId: r.unitId,
  itemId: r.itemId,
  itemName: r.inventoryItem.inventoryName,
  quantity: r.quantity,
  condition: r.itemCondition,
  description: r.description,
});
const NAME = ["An item with this name already exists", "ITEM_NAME_TAKEN"] as const;

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async listItems(propertyId: string, q: IItemListQuery) {
    const where: Prisma.InventoryItemWhereInput = {
      propertyId,
      deletedAt: null,
      ...(q.q && { inventoryName: { contains: q.q, mode: "insensitive" } }),
    };
    const [rows, total] = await Promise.all([
      this.db.inventoryItem.findMany({ where, orderBy: { inventoryName: "asc" }, ...toSkipTake(q) }),
      this.db.inventoryItem.count({ where }),
    ]);
    return paginated(rows.map(toItem), total, q);
  }
  async findItem(propertyId: string, itemId: string) {
    const r = await this.db.inventoryItem.findFirst({ where: { id: itemId, propertyId, deletedAt: null } });
    return r ? toItem(r) : null;
  }
  createItems(c: IBulkItemsCommand) {
    return orConflict(
      () =>
        this.db.$transaction(async (tx) => {
          const out: IItemResponse[] = [];
          for (const it of c.items) out.push(toItem(await tx.inventoryItem.create({ data: { propertyId: c.propertyId, inventoryName: it.name } })));
          return out;
        }),
      ...NAME,
    );
  }
  createItem(c: ICreateItemCommand) {
    return orConflict(async () => toItem(await this.db.inventoryItem.create({ data: { propertyId: c.propertyId, inventoryName: c.name } })), ...NAME);
  }
  async updateItem(c: IUpdateItemCommand) {
    if (!(await this.findItem(c.propertyId, c.itemId))) return null;
    return orConflict(async () => toItem(await this.db.inventoryItem.update({ where: { id: c.itemId }, data: { inventoryName: c.name } })), ...NAME);
  }
  async itemInUse(itemId: string) {
    return (await this.db.handover.count({ where: { itemId, deletedAt: null } })) > 0;
  }
  async softDeleteItem(propertyId: string, itemId: string) {
    return (await this.db.inventoryItem.updateMany({ where: { id: itemId, propertyId, deletedAt: null }, data: { deletedAt: new Date() } })).count > 0;
  }

  async unitExists(propertyId: string, unitId: string) {
    return (await this.db.unit.count({ where: { id: unitId, propertyId, deletedAt: null } })) > 0;
  }
  async listHandovers(propertyId: string, unitId: string) {
    const rows = await this.db.handover.findMany({ where: { propertyId, unitId, deletedAt: null }, include, orderBy: { createdAt: "asc" } });
    return rows.map(toHandover);
  }
  createHandover(c: ICreateHandoverCommand) {
    return orConflict(
      async () =>
        toHandover(
          await this.db.handover.create({
            data: { propertyId: c.propertyId, unitId: c.unitId, itemId: c.itemId, quantity: c.quantity, itemCondition: c.condition, description: c.description },
            include,
          }),
        ),
      "This item is already on the unit handover list",
      "HANDOVER_EXISTS",
    );
  }
  async updateHandover(c: IUpdateHandoverCommand) {
    const where = { id: c.handoverId, propertyId: c.propertyId, unitId: c.unitId, deletedAt: null };
    if (!(await this.db.handover.count({ where }))) return null;
    const r = await this.db.handover.update({
      where: { id: c.handoverId },
      data: { quantity: c.quantity, itemCondition: c.condition, description: c.description },
      include,
    });
    return toHandover(r);
  }
  async softDeleteHandover(propertyId: string, unitId: string, handoverId: string) {
    return (await this.db.handover.updateMany({ where: { id: handoverId, propertyId, unitId, deletedAt: null }, data: { deletedAt: new Date() } })).count > 0;
  }
}
