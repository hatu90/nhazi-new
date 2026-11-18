export type AuthProvider = "phone" | "google" | "facebook" | "apple" | "password";

/** Identity proven by a verified credential (e.g. a Firebase ID token). Not yet an account. */
export interface IVerifiedIdentity {
  provider: AuthProvider;
  providerUserId: string;
  phoneNumber: string | null;
  displayName: string | null;
}

/** Port: turns a bearer token into a verified identity or throws UnauthorizedError. */
export interface ITokenVerifier {
  verify(token: string): Promise<IVerifiedIdentity>;
}
