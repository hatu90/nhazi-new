import type { PropertyRole } from "@/server/shared/schema";

/** Port: who may do what on a property. */
export interface IAccessRepository {
  findPropertyRole(accountId: string, propertyId: string): Promise<PropertyRole | null>;
}
