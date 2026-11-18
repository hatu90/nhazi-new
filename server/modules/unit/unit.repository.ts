import type { IPaginated } from "@/server/shared/pagination";
import type { ICreateUnitCommand,
  IBulkUnitsCommand, IUnitListQuery, IUnitResponse, IUpdateUnitCommand } from "./unit.schema";

export interface IUnitRepository {
  list(propertyId: string, query: IUnitListQuery): Promise<IPaginated<IUnitResponse>>;
  findById(propertyId: string, unitId: string): Promise<IUnitResponse | null>;
  /** All or nothing. ConflictError UNIT_NAME_TAKEN. */
  createMany(command: IBulkUnitsCommand): Promise<IUnitResponse[]>;
  create(command: ICreateUnitCommand): Promise<IUnitResponse>;
  /** ConflictError UNIT_NAME_TAKEN; null when the unit does not exist in the property. */
  update(command: IUpdateUnitCommand): Promise<IUnitResponse | null>;
  hasLeases(unitId: string): Promise<boolean>;
  softDelete(propertyId: string, unitId: string): Promise<boolean>;
}
