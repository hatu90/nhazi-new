import type { IActor } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IFileStorage } from "../storage/storage.port";
import { draftFilePrefix, propertyFilePrefix } from "../storage/storage.usecases";
import type { IPropertyRepository } from "./property.repository";
import type {
  IAdminPropertyListQuery,
  IAdminPropertyListResponse,
  IAdminPropertyResponse,
  ICreatePropertyCommand,
  IUpdatePropertyCommand,
  IPropertyDetailResponse,
  IPropertySearchQuery,
  IPublicPropertyDetail,
  IPropertySearchResponse,
} from "./property.schema";

// ── public ──────────────────────────────────────────────────────────────────────────
export class SearchPropertiesUseCase implements IUseCase<IPropertySearchQuery, IPropertySearchResponse> {
  constructor(private readonly properties: IPropertyRepository) {}
  execute(query: IPropertySearchQuery) {
    return this.properties.search(query);
  }
}

export class GetPublicPropertyUseCase implements IUseCase<{ propertyId: string }, IPublicPropertyDetail> {
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
  constructor(
    private readonly properties: IPropertyRepository,
    private readonly storage: IFileStorage,
  ) {}
  async execute(command: ICreatePropertyCommand) {
    // images arrive as keys of the caller's own draft uploads; they are moved under the property once it has an id
    const prefix = draftFilePrefix(command.actor.accountId);
    const drafts = [...(command.headerImage ? [command.headerImage] : []), ...command.images];
    if (drafts.some((k) => !k.startsWith(prefix) || k.includes(".."))) {
      throw new ValidationError("Images must be uploaded first", { fieldErrors: { images: ["Images must be uploaded first"] } });
    }
    const created = await this.properties.create({ ...command, headerImage: undefined, images: [] });
    if (drafts.length === 0) return { ...created, role: "owner" as const };
    const moved = new Map<string, string>();
    for (const key of new Set(drafts)) {
      const to = `${propertyFilePrefix(created.id)}${key.slice(prefix.length)}`;
      await this.storage.move(key, to);
      moved.set(key, to);
    }
    const property = await this.properties.update({
      actor: command.actor,
      propertyId: created.id,
      headerImage: command.headerImage ? moved.get(command.headerImage)! : undefined,
      images: command.images.map((k) => moved.get(k)!),
    });
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

/** Soft delete: hides the property everywhere. Owner only; refused while any lease exists. */
export class DeletePropertyUseCase implements IUseCase<{ actor: IActor; propertyId: string }, void> {
  constructor(
    private readonly properties: IPropertyRepository,
    private readonly policy: AccessPolicy,
  ) {}
  async execute({ actor, propertyId }: { actor: IActor; propertyId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.ownerOnly);
    if (await this.properties.hasLeases(propertyId)) throw new ConflictError("The property has leases and cannot be deleted", "PROPERTY_IN_USE");
    if (!(await this.properties.softDelete(propertyId))) throw new NotFoundError("Property");
  }
}
