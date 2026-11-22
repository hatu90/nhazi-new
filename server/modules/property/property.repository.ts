import type { IPaginated } from "@/server/shared/pagination";
import type {
  IAdminPropertyDetail,
  IAdminPropertyListQuery,
  IAdminPropertySummaryResponse,
  ICreatePropertyCommand,
  IUpdatePropertyCommand,
  IPropertyDetailResponse,
  IPropertySearchQuery,
  IPublicPropertyDetail,
  IPropertySummaryResponse,
} from "./property.schema";

export interface IPropertyRepository {
  // public
  search(query: IPropertySearchQuery): Promise<IPaginated<IPropertySummaryResponse>>;
  findPublicById(propertyId: string): Promise<IPublicPropertyDetail | null>;
  // admin
  listManaged(accountId: string, query: IAdminPropertyListQuery): Promise<IPaginated<IAdminPropertySummaryResponse>>;
  findAdminById(propertyId: string): Promise<IAdminPropertyDetail | null>;
  /** Creates the property and makes the actor its `owner`, atomically. */
  create(command: ICreatePropertyCommand): Promise<IAdminPropertyDetail>;
  update(command: IUpdatePropertyCommand): Promise<IAdminPropertyDetail>;
  /** True when the property still has any (non-deleted) lease. */
  hasLeases(propertyId: string): Promise<boolean>;
  softDelete(propertyId: string): Promise<boolean>;
}
