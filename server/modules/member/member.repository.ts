import type { PropertyRole } from "@/server/shared/schema";
import type { IMemberResponse } from "./member.schema";

export interface IMemberRepository {
  list(propertyId: string): Promise<IMemberResponse[]>;
  find(propertyId: string, accountId: string): Promise<IMemberResponse | null>;
  findAccountIdByPhone(phoneNumber: string): Promise<string | null>;
  countOwners(propertyId: string): Promise<number>;
  /** ConflictError ALREADY_MEMBER. */
  add(propertyId: string, accountId: string, role: PropertyRole): Promise<IMemberResponse>;
  setRole(propertyId: string, accountId: string, role: PropertyRole): Promise<IMemberResponse>;
  remove(propertyId: string, accountId: string): Promise<void>;
}
