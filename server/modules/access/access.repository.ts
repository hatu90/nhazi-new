import type { PropertyRole } from "@/server/shared/schema";

/** Port: who may do what on a property. */
export interface IAccessRepository {
  isPlatformAdmin(accountId: string): Promise<boolean>;
  /** The active account whose (verified) phone number is `SUPER_ADMIN_PHONE`. */
  isSuperAdmin(accountId: string): Promise<boolean>;
  findPropertyRole(accountId: string, propertyId: string): Promise<PropertyRole | null>;
}
