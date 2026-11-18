import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IInventoryRepository } from "./inventory.repository";
import type {
  ICreateHandoverCommand,
  ICreateItemCommand,
  IHandoverResponse,
  IItemListQuery,
  IItemListResponse,
  IItemResponse,
  IUpdateHandoverCommand,
  IUpdateItemCommand,
} from "./inventory.schema";

abstract class Base {
  constructor(protected readonly inventory: IInventoryRepository, protected readonly policy: AccessPolicy) {}
  protected async unit(propertyId: string, unitId: string) {
    if (!(await this.inventory.unitExists(propertyId, unitId))) throw new NotFoundError("Unit");
  }
}

export class ListItemsUseCase extends Base implements IUseCase<IPropertyScope & { query: IItemListQuery }, IItemListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IItemListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.inventory.listItems(propertyId, query);
  }
}
export class CreateItemUseCase extends Base implements IUseCase<ICreateItemCommand, IItemResponse> {
  async execute(c: ICreateItemCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    return this.inventory.createItem(c);
  }
}
export class UpdateItemUseCase extends Base implements IUseCase<IUpdateItemCommand, IItemResponse> {
  async execute(c: IUpdateItemCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const item = await this.inventory.updateItem(c);
    if (!item) throw new NotFoundError("Item");
    return item;
  }
}
export class DeleteItemUseCase extends Base implements IUseCase<IPropertyScope & { itemId: string }, void> {
  async execute({ actor, propertyId, itemId }: IPropertyScope & { itemId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if (!(await this.inventory.findItem(propertyId, itemId))) throw new NotFoundError("Item");
    if (await this.inventory.itemInUse(itemId)) throw new ConflictError("The item is on a unit handover list", "ITEM_IN_USE");
    await this.inventory.softDeleteItem(propertyId, itemId);
  }
}

export class ListHandoversUseCase extends Base implements IUseCase<IPropertyScope & { unitId: string }, IHandoverResponse[]> {
  async execute({ actor, propertyId, unitId }: IPropertyScope & { unitId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    await this.unit(propertyId, unitId);
    return this.inventory.listHandovers(propertyId, unitId);
  }
}
export class CreateHandoverUseCase extends Base implements IUseCase<ICreateHandoverCommand, IHandoverResponse> {
  async execute(c: ICreateHandoverCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    await this.unit(c.propertyId, c.unitId);
    if (!(await this.inventory.findItem(c.propertyId, c.itemId))) throw new NotFoundError("Item");
    return this.inventory.createHandover(c);
  }
}
export class UpdateHandoverUseCase extends Base implements IUseCase<IUpdateHandoverCommand, IHandoverResponse> {
  async execute(c: IUpdateHandoverCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const h = await this.inventory.updateHandover(c);
    if (!h) throw new NotFoundError("Handover");
    return h;
  }
}
export class DeleteHandoverUseCase extends Base implements IUseCase<IPropertyScope & { unitId: string; handoverId: string }, void> {
  async execute({ actor, propertyId, unitId, handoverId }: IPropertyScope & { unitId: string; handoverId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if (!(await this.inventory.softDeleteHandover(propertyId, unitId, handoverId))) throw new NotFoundError("Handover");
  }
}
