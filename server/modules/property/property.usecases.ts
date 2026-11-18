import type { IActor } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IPropertyRepository } from "./property.repository";
import type {
  IAdminPropertyListQuery,
  IAdminPropertyListResponse,
  IAdminPropertyResponse,
  ICreatePropertyCommand,
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
