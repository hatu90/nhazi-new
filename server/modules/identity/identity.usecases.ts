import type { IActor } from "@/server/shared/actor";
import type { IUseCase } from "@/server/shared/usecase";
import type { ITokenVerifier, IVerifiedIdentity } from "@/server/shared/auth";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IAccountRepository } from "./identity.repository";
import type { IAccountResponse, IMeResponse, IRegisterCommand, IUpdateMeCommand } from "./identity.schema";

/** token -> verified identity (account may not exist yet). */
export class VerifyTokenUseCase implements IUseCase<{ token: string }, IVerifiedIdentity> {
  constructor(private readonly verifier: ITokenVerifier) {}
  execute({ token }: { token: string }) {
    return this.verifier.verify(token);
  }
}

/** token -> registered, active actor. */
export class AuthenticateUseCase implements IUseCase<{ token: string }, IActor> {
  constructor(
    private readonly verifier: ITokenVerifier,
    private readonly accounts: IAccountRepository,
  ) {}

  async execute({ token }: { token: string }): Promise<IActor> {
    const identity = await this.verifier.verify(token);
    const account = await this.accounts.findAccountIdByIdentity(identity.provider, identity.providerUserId);
    if (!account) throw new ForbiddenError("Account is not registered", "ACCOUNT_NOT_REGISTERED");
    if (!account.active) throw new ForbiddenError("Account is not active", "ACCOUNT_INACTIVE");
    return { accountId: account.id };
  }
}

export class RegisterUseCase implements IUseCase<IRegisterCommand, IAccountResponse> {
  constructor(private readonly accounts: IAccountRepository, private readonly onRegistered?: IUseCase<{ accountId: string; phoneNumber: string }, void>) {}

  async execute(command: IRegisterCommand): Promise<IAccountResponse> {
    const { identity } = command;
    // A phone-provider token already proves the phone number: the payload must agree with it.
    if (identity.phoneNumber && identity.phoneNumber !== command.phoneNumber) {
      throw new ValidationError("Phone number does not match the verified phone", {
        fieldErrors: { phoneNumber: ["Does not match the verified phone number"] },
      });
    }
    const existing = await this.accounts.findAccountIdByIdentity(identity.provider, identity.providerUserId);
    if (existing) throw new ConflictError("This login is already registered", "ALREADY_REGISTERED");
    const account = await this.accounts.createWithIdentity(command);
    // invitations sent to this phone before it had an account now reach a person
    await this.onRegistered?.execute({ accountId: account.id, phoneNumber: command.phoneNumber }).catch((err) => console.error("[notifications] backfill failed", err));
    return account;
  }
}

export class GetMeUseCase implements IUseCase<IActor, IMeResponse> {
  constructor(private readonly accounts: IAccountRepository) {}
  async execute(actor: IActor) {
    const me = await this.accounts.findMe(actor.accountId);
    if (!me) throw new NotFoundError("Account");
    return me;
  }
}

export class UpdateMeUseCase implements IUseCase<IUpdateMeCommand, IAccountResponse> {
  constructor(private readonly accounts: IAccountRepository) {}
  execute(command: IUpdateMeCommand) {
    return this.accounts.updateProfile(command);
  }
}
