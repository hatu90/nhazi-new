import type { IActor } from "@/server/shared/actor";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IPropertyRepository } from "./property.repository";
import type {
  IAdminPropertyListQuery,
  IAdminPropertyListResponse,
  IAdminPropertyResponse,
  ICreatePropertyCommand,
  IUpdatePropertyCommand,
  IPropertyDetailResponse,
  IPropertySearchQuery,
  IPropertySearchResponse,
} from "./property.schema";

// ── public ──────────────────────────────────────────────────────────────────────────
export class SearchPropertiesUseCase implements IUseCase<IPropertySearchQuery, IPropertySearchResponse> {
  constructor(private readonly properties: IPropertyRepository) {}
  execute(query: IPropertySearchQuery) {
    return this.properties.search(query);
  }
}

export class GetPublicPropertyUseCase implements IUseCase<{ propertyId: string }, IPropertyDetailResponse> {
  constructor(private readonly properties: IPropertyRepository) {}
  async execute({ propertyId }: { propertyId: string }) {
    const property = await this.properties.findPublicById(propertyId);
    if (!property) throw new NotFoundError("Property");
    return property;
  }
}

// ── admin ───────────────────────────────────────────────────────────────────────────
export class ListManagedPropertiesUseCase
  implements IUseCase<{ actor: IActor; query: IAdminPropertyListQuery }, IAdminPropertyListResponse>
{
  constructor(private readonly properties: IPropertyRepository) {}
  execute({ actor, query }: { actor: IActor; query: IAdminPropertyListQuery }) {
    return this.properties.listManaged(actor.accountId, query);
  }
}

export class GetManagedPropertyUseCase implements IUseCase<{ actor: IActor; propertyId: string }, IAdminPropertyResponse> {
  constructor(
    private readonly properties: IPropertyRepository,
    private readonly policy: AccessPolicy,
  ) {}
  async execute({ actor, propertyId }: { actor: IActor; propertyId: string }) {
    const role = await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const property = await this.properties.findAdminById(propertyId);
    if (!property) throw new NotFoundError("Property");
    return { ...property, role };
  }
}

export class CreatePropertyUseCase implements IUseCase<ICreatePropertyCommand, IAdminPropertyResponse> {
  constructor(private readonly properties: IPropertyRepository) {}
  async execute(command: ICreatePropertyCommand) {
    const property = await this.properties.create(command);
    return { ...property, role: "owner" as const };
  }
}

/** Setup / edit: images, header image, rules, address, price range. Owners and admins. */
export class UpdatePropertyUseCase implements IUseCase<IUpdatePropertyCommand, IAdminPropertyResponse> {
  constructor(
    private readonly properties: IPropertyRepository,
    private readonly policy: AccessPolicy,
  ) {}
  async execute(c: IUpdatePropertyCommand) {
    const role = await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const current = await this.properties.findAdminById(c.propertyId);
    if (!current) throw new NotFoundError("Property");
    // a one-sided price change must still respect the other side
    const from = c.rentPriceFrom === undefined ? current.rentPriceFrom : c.rentPriceFrom;
    const to = c.rentPriceTo === undefined ? current.rentPriceTo : c.rentPriceTo;
    if (from !== null && to !== null && from > to) {
      throw new ValidationError("rentPriceFrom must be <= rentPriceTo", { fieldErrors: { rentPriceTo: ["rentPriceFrom must be <= rentPriceTo"] } });
    }
    return { ...(await this.properties.update(c)), role };
  }
}
