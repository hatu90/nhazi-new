import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
  private app() {
    const existing = getApps()[0];
    if (existing) return existing;
    const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
    return initializeApp(
      projectId && clientEmail && key
        ? { credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") }) }
        : undefined, // falls back to GOOGLE_APPLICATION_CREDENTIALS
    );
  }

  async verify(token: string): Promise<IVerifiedIdentity> {
    let decoded;
    try {
      decoded = await getAuth(this.app()).verifyIdToken(token);
    } catch {
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
