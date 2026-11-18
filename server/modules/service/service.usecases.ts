import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IServiceRepository } from "./service.repository";
import {
  tiersFitUsageBase,
  type IAddPriceCommand,
  type ICreateServiceCommand,
  type IServiceListQuery,
  type IServiceListResponse,
  type IServiceResponse,
  type IUpdateServiceCommand,
} from "./service.schema";

type Svc = { serviceId: string };
abstract class Base {
  constructor(protected readonly services: IServiceRepository, protected readonly policy: AccessPolicy) {}
  protected async get(propertyId: string, serviceId: string) {
    const s = await this.services.findById(propertyId, serviceId);
    if (!s) throw new NotFoundError("Service");
    return s;
  }
}

export class ListServicesUseCase extends Base implements IUseCase<IPropertyScope & { query: IServiceListQuery }, IServiceListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: IServiceListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.services.list(propertyId, query);
  }
}
export class GetServiceUseCase extends Base implements IUseCase<IPropertyScope & Svc, IServiceResponse> {
  async execute({ actor, propertyId, serviceId }: IPropertyScope & Svc) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.get(propertyId, serviceId);
  }
}
export class CreateServiceUseCase extends Base implements IUseCase<ICreateServiceCommand, IServiceResponse> {
  async execute(c: ICreateServiceCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    return this.services.create(c);
  }
}
export class UpdateServiceUseCase extends Base implements IUseCase<IUpdateServiceCommand, IServiceResponse> {
  async execute(c: IUpdateServiceCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const s = await this.services.update(c);
    if (!s) throw new NotFoundError("Service");
    return s;
  }
}
export class AddServicePriceUseCase extends Base implements IUseCase<IAddPriceCommand, IServiceResponse> {
  async execute(c: IAddPriceCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const service = await this.get(c.propertyId, c.serviceId);
    if (!tiersFitUsageBase(service.usageBase, [c.version])) {
      throw new ValidationError("This usage base takes a single flat tier", { fieldErrors: { tiers: ["Single flat tier required"] } });
    }
    const last = service.prices[service.prices.length - 1];
    if (last && c.version.effectiveDate <= last.effectiveDate) {
      throw new ValidationError("effectiveDate must be later than the latest price version", {
        fieldErrors: { effectiveDate: [`Must be after ${last.effectiveDate}`] },
      });
    }
    const updated = await this.services.appendPrice(c.propertyId, c.serviceId, c.version);
    if (!updated) throw new NotFoundError("Service");
    return updated;
  }
}
export class DeleteServiceUseCase extends Base implements IUseCase<IPropertyScope & Svc, void> {
  async execute({ actor, propertyId, serviceId }: IPropertyScope & Svc) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    await this.get(propertyId, serviceId);
    if (await this.services.isInUse(serviceId)) throw new ConflictError("The service has meters or subscriptions", "SERVICE_IN_USE");
    await this.services.softDelete(propertyId, serviceId);
  }
}
