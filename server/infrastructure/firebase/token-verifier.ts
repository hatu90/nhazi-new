import { getAuth } from "firebase-admin/auth";
import { getFirebaseApp } from "./app";
import type { AuthProvider, ITokenVerifier, IVerifiedIdentity } from "@/server/shared/auth";
import { UnauthorizedError } from "@/server/shared/errors";

const PROVIDERS: Record<string, AuthProvider> = {
  phone: "phone",
  "google.com": "google",
  "facebook.com": "facebook",
  "apple.com": "apple",
  password: "password",
};

/** Verifies Firebase ID tokens. Credentials via FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. */
export class FirebaseTokenVerifier implements ITokenVerifier {
  async verify(token: string): Promise<IVerifiedIdentity> {
    let decoded;
    try {
      decoded = await getAuth(getFirebaseApp()).verifyIdToken(token);
    } catch (err) {
      // Bad tokens are routine; anything else (credentials, network) is a server problem that must not hide as a 401.
      const { code = "", message = "" } = err as { code?: string; message?: string };
      // "auth/argument-error" also covers a wrong audience/issuer (token from another Firebase project), so it is logged too.
      if (!code.startsWith("auth/id-token-expired")) console.error(`[auth] token verification failed: ${code} ${message}`);
      throw new UnauthorizedError("Invalid or expired token");
    }
    const provider = PROVIDERS[decoded.firebase.sign_in_provider];
    if (!provider) throw new UnauthorizedError("Unsupported sign-in provider");
    return {
      provider,
      providerUserId: decoded.uid,
      phoneNumber: decoded.phone_number ?? null,
      displayName: typeof decoded.name === "string" ? decoded.name : null,
    };
  }
}

/**
 * LOCAL DEVELOPMENT ONLY. Accepts `dev:<uid>[:<+phone>]` tokens when AUTH_DEV_BYPASS=1 and NODE_ENV != production;
 * everything else is delegated to the real verifier.
 */
export class DevAwareTokenVerifier implements ITokenVerifier {
  constructor(private readonly real: ITokenVerifier) {}

  async verify(token: string): Promise<IVerifiedIdentity> {
    const enabled = process.env.AUTH_DEV_BYPASS === "1" && process.env.NODE_ENV !== "production";
    if (enabled && token.startsWith("dev:")) {
      const [, uid, phone] = token.split(":");
      if (!uid) throw new UnauthorizedError("Malformed dev token");
      return { provider: phone ? "phone" : "password", providerUserId: `dev-${uid}`, phoneNumber: phone ?? null, displayName: null };
    }
    return this.real.verify(token);
  }
}
