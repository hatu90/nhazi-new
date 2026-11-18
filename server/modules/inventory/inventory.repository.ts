import type { IPaginated } from "@/server/shared/pagination";
import type {
  ICreateHandoverCommand,
  ICreateItemCommand,
  IHandoverResponse,
  IItemListQuery,
  IItemResponse,
  IUpdateHandoverCommand,
  IUpdateItemCommand,
} from "./inventory.schema";

export interface IInventoryRepository {
  listItems(propertyId: string, query: IItemListQuery): Promise<IPaginated<IItemResponse>>;
  findItem(propertyId: string, itemId: string): Promise<IItemResponse | null>;
  /** ConflictError ITEM_NAME_TAKEN. */
  createItem(command: ICreateItemCommand): Promise<IItemResponse>;
  updateItem(command: IUpdateItemCommand): Promise<IItemResponse | null>;
  itemInUse(itemId: string): Promise<boolean>;
  softDeleteItem(propertyId: string, itemId: string): Promise<boolean>;

  unitExists(propertyId: string, unitId: string): Promise<boolean>;
  listHandovers(propertyId: string, unitId: string): Promise<IHandoverResponse[]>;
  /** ConflictError HANDOVER_EXISTS (one row per item per unit). */
  createHandover(command: ICreateHandoverCommand): Promise<IHandoverResponse>;
  updateHandover(command: IUpdateHandoverCommand): Promise<IHandoverResponse | null>;
  softDeleteHandover(propertyId: string, unitId: string, handoverId: string): Promise<boolean>;
}
