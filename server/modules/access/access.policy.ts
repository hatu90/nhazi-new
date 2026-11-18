import type { IActor } from "@/server/shared/actor";
import { ForbiddenError, NotFoundError } from "@/server/shared/errors";
import type { PropertyRole } from "@/server/shared/schema";
import type { IAccessRepository } from "./access.repository";

/**
 * Shared authorisation rule used by admin usecases.
 * No membership -> 404 (do not reveal that the property exists); wrong role -> 403.
 */
export class AccessPolicy {
  constructor(private readonly access: IAccessRepository) {}

  async assertPropertyRole(actor: IActor, propertyId: string, allowed: readonly PropertyRole[]): Promise<PropertyRole> {
    const role = await this.access.findPropertyRole(actor.accountId, propertyId);
    if (!role) throw new NotFoundError("Property");
    if (!allowed.includes(role)) throw new ForbiddenError();
    return role;
  }
}

export const ROLES = {
  read: ["owner", "admin", "technician", "viewer"],
  field: ["owner", "admin", "technician"],
  manage: ["owner", "admin"],
  ownerOnly: ["owner"],
} as const satisfies Record<string, readonly PropertyRole[]>;
