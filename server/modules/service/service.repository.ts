import type { IPaginated } from "@/server/shared/pagination";
import type { IPriceVersion, ICreateServiceCommand,
  IBulkServicesCommand, IServiceListQuery, IServiceResponse, IUpdateServiceCommand } from "./service.schema";

export interface IServiceRepository {
  list(propertyId: string, query: IServiceListQuery): Promise<IPaginated<IServiceResponse>>;
  findById(propertyId: string, serviceId: string): Promise<IServiceResponse | null>;
  /** All or nothing. ConflictError SERVICE_NAME_TAKEN. */
  createMany(command: IBulkServicesCommand): Promise<IServiceResponse[]>;
  create(command: ICreateServiceCommand): Promise<IServiceResponse>;
  update(command: IUpdateServiceCommand): Promise<IServiceResponse | null>;
  /** Appends atomically; ConflictError if another writer changed the prices meanwhile. */
  appendPrice(propertyId: string, serviceId: string, version: IPriceVersion): Promise<IServiceResponse | null>;
  /** Replaces the tiers of the latest version; same optimistic lock as appendPrice. */
  replaceLatestPrice(propertyId: string, serviceId: string, tiers: IPriceVersion["tiers"]): Promise<IServiceResponse | null>;
  isInUse(serviceId: string): Promise<boolean>;
  softDelete(propertyId: string, serviceId: string): Promise<boolean>;
}
