import type { AuthProvider } from "@/server/shared/auth";
import type { IAccountResponse, IMeResponse, IRegisterCommand, IUpdateMeCommand } from "./identity.schema";

export interface IAccountRepository {
  /** Resolve a verified credential to a registered account (null = not registered). */
  findAccountIdByIdentity(provider: AuthProvider, providerUserId: string): Promise<{ id: string; active: boolean } | null>;
  /** Throws ConflictError when the phone number or identity is already taken. */
  createWithIdentity(command: IRegisterCommand): Promise<IAccountResponse>;
  findMe(accountId: string): Promise<IMeResponse | null>;
  updateProfile(command: IUpdateMeCommand): Promise<IAccountResponse>;
}
