import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IMeterRepository } from "./meter.repository";
import type { IBulkMetersCommand, ICreateMeterCommand, IMeterListQuery, IMeterListResponse, IMeterResponse, IUpdateMeterCommand } from "./meter.schema";

type Mtr = { meterId: string };
abstract class Base {
  constructor(protected readonly meters: IMeterRepository, protected readonly policy: AccessPolicy) {}
  protected async get(propertyId: string, meterId: string) {
    const m = await this.meters.findById(propertyId, meterId);
    if (!m) throw new NotFoundError("Meter");
    return m;
  }
}

export class ListMetersUseCase extends Base implements IUseCase<IPropertyScope & { query: IMeterListQuery }, IMeterListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IMeterListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.meters.list(propertyId, query);
  }
}
export class GetMeterUseCase extends Base implements IUseCase<IPropertyScope & Mtr, IMeterResponse> {
  async execute({ actor, propertyId, meterId }: IPropertyScope & Mtr) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.get(propertyId, meterId);
  }
}
export class CreateMeterUseCase extends Base implements IUseCase<ICreateMeterCommand, IMeterResponse> {
  async execute(c: ICreateMeterCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.meters.unitExists(c.propertyId, c.unitId))) throw new NotFoundError("Unit");
    const base = await this.meters.findServiceUsageBase(c.propertyId, c.serviceId);
    if (!base) throw new NotFoundError("Service");
    if (base !== "meter") {
      throw new ValidationError("Only services billed by meter can have meters", { fieldErrors: { serviceId: ["Not a meter service"] } });
    }
    return this.meters.create(c);
  }
}
/** Every unit must be in the property and every service must be a meter service. */
export class BulkCreateMetersUseCase extends Base implements IUseCase<IBulkMetersCommand, IMeterResponse[]> {
  async execute(c: IBulkMetersCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    for (const unitId of new Set(c.items.map((i) => i.unitId))) {
      if (!(await this.meters.unitExists(c.propertyId, unitId))) throw new NotFoundError("Unit");
    }
    for (const serviceId of new Set(c.items.map((i) => i.serviceId))) {
      const base = await this.meters.findServiceUsageBase(c.propertyId, serviceId);
      if (!base) throw new NotFoundError("Service");
      if (base !== "meter") throw new ValidationError("Only services billed by meter can have meters", { fieldErrors: { serviceId: ["Not a meter service"] } });
    }
    return this.meters.createMany(c);
  }
}
export class UpdateMeterUseCase extends Base implements IUseCase<IUpdateMeterCommand, IMeterResponse> {
  async execute(c: IUpdateMeterCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const m = await this.meters.update(c);
    if (!m) throw new NotFoundError("Meter");
    return m;
  }
}
export class DeleteMeterUseCase extends Base implements IUseCase<IPropertyScope & Mtr, void> {
  async execute({ actor, propertyId, meterId }: IPropertyScope & Mtr) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    await this.get(propertyId, meterId);
    if (await this.meters.isInUse(meterId)) throw new ConflictError("The meter has readings or subscriptions", "METER_IN_USE");
    await this.meters.softDelete(propertyId, meterId);
  }
}
