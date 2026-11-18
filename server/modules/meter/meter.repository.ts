import type { IPaginated } from "@/server/shared/pagination";
import type { ServiceUsageBase } from "@/server/shared/schema";
import type { ICreateMeterCommand, IMeterListQuery, IMeterResponse, IUpdateMeterCommand } from "./meter.schema";

export interface IMeterRepository {
  list(propertyId: string, query: IMeterListQuery): Promise<IPaginated<IMeterResponse>>;
  findById(propertyId: string, meterId: string): Promise<IMeterResponse | null>;
  create(command: ICreateMeterCommand): Promise<IMeterResponse>;
  update(command: IUpdateMeterCommand): Promise<IMeterResponse | null>;
  unitExists(propertyId: string, unitId: string): Promise<boolean>;
  findServiceUsageBase(propertyId: string, serviceId: string): Promise<ServiceUsageBase | null>;
  isInUse(meterId: string): Promise<boolean>;
  softDelete(propertyId: string, meterId: string): Promise<boolean>;
}
