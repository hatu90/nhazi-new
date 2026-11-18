import type { IPaginated } from "@/server/shared/pagination";
import type { IPriceVersion, ICreateServiceCommand, IServiceListQuery, IServiceResponse, IUpdateServiceCommand } from "./service.schema";

export interface IServiceRepository {
  list(propertyId: string, query: IServiceListQuery): Promise<IPaginated<IServiceResponse>>;
  findById(propertyId: string, serviceId: string): Promise<IServiceResponse | null>;
  /** ConflictError SERVICE_NAME_TAKEN. */
  create(command: ICreateServiceCommand): Promise<IServiceResponse>;
  update(command: IUpdateServiceCommand): Promise<IServiceResponse | null>;
  /** Appends atomically; ConflictError if another writer changed the prices meanwhile. */
  appendPrice(propertyId: string, serviceId: string, version: IPriceVersion): Promise<IServiceResponse | null>;
  isInUse(serviceId: string): Promise<boolean>;
  softDelete(propertyId: string, serviceId: string): Promise<boolean>;
}
