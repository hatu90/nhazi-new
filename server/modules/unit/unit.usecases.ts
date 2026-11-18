import { ConflictError, NotFoundError } from "@/server/shared/errors";
import type { IPropertyScope } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IUnitRepository } from "./unit.repository";
import type { IBulkUnitsCommand, ICreateUnitCommand, IUnitListQuery, IUnitListResponse, IUnitResponse, IUpdateUnitCommand } from "./unit.schema";

type Unit = { unitId: string };

export class ListUnitsUseCase implements IUseCase<IPropertyScope & { query: IUnitListQuery }, IUnitListResponse> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IUnitListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.units.list(propertyId, query);
  }
}

export class GetUnitUseCase implements IUseCase<IPropertyScope & Unit, IUnitResponse> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId, unitId }: IPropertyScope & Unit) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const unit = await this.units.findById(propertyId, unitId);
    if (!unit) throw new NotFoundError("Unit");
    return unit;
  }
}

export class CreateUnitUseCase implements IUseCase<ICreateUnitCommand, IUnitResponse> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute(command: ICreateUnitCommand) {
    await this.policy.assertPropertyRole(command.actor, command.propertyId, ROLES.manage);
    return this.units.create(command);
  }
}

export class BulkCreateUnitsUseCase implements IUseCase<IBulkUnitsCommand, IUnitResponse[]> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute(command: IBulkUnitsCommand) {
    await this.policy.assertPropertyRole(command.actor, command.propertyId, ROLES.manage);
    return this.units.createMany(command);
  }
}

export class UpdateUnitUseCase implements IUseCase<IUpdateUnitCommand, IUnitResponse> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute(command: IUpdateUnitCommand) {
    await this.policy.assertPropertyRole(command.actor, command.propertyId, ROLES.manage);
    const unit = await this.units.update(command);
    if (!unit) throw new NotFoundError("Unit");
    return unit;
  }
}

export class DeleteUnitUseCase implements IUseCase<IPropertyScope & Unit, void> {
  constructor(private readonly units: IUnitRepository, private readonly policy: AccessPolicy) {}
  async execute({ actor, propertyId, unitId }: IPropertyScope & Unit) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if (!(await this.units.findById(propertyId, unitId))) throw new NotFoundError("Unit");
    if (await this.units.hasLeases(unitId)) throw new ConflictError("The unit has leases and cannot be deleted", "UNIT_IN_USE");
    await this.units.softDelete(propertyId, unitId);
  }
}
