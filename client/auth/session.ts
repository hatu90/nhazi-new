/**
 * Where the bearer token comes from: Firebase phone auth (NEXT_PUBLIC_FIREBASE_* env vars), in development too.
 * For local work add your test numbers in Firebase console -> Authentication -> Sign-in method -> Phone ->
 * "Phone numbers for testing" (fixed codes, no SMS sent) and make sure `localhost` is an authorized domain.
 */
import type { Auth, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

export interface SessionUser {
  phone: string | null;
  displayName: string | null;
}

// ── firebase ──────────────────────────────────────────────────────────────────────
let authPromise: Promise<Auth> | null = null;
const firebaseAuth = (): Promise<Auth> => {
  authPromise ??= (async () => {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth } = await import("firebase/auth");
    const app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
    const auth = getAuth(app);
    await auth.authStateReady();
    return auth;
  })();
  return authPromise;
};

export const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// ── unified surface ───────────────────────────────────────────────────────────────
export async function getToken(): Promise<string | null> {
  if (!firebaseConfigured) return null;
  const auth = await firebaseAuth();
  return (await auth.currentUser?.getIdToken()) ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!firebaseConfigured) return null;
  const user = (await firebaseAuth()).currentUser;
  return user ? { phone: user.phoneNumber, displayName: user.displayName } : null;
}

export async function signOut(): Promise<void> {
  if (firebaseConfigured) await (await firebaseAuth()).signOut();
}

/** Calls back whenever the Firebase user changes. */
export async function onSessionChange(cb: () => void): Promise<() => void> {
  if (!firebaseConfigured) return () => {};
  const { onAuthStateChanged } = await import("firebase/auth");
  return onAuthStateChanged(await firebaseAuth(), cb);
}

// ── phone OTP (firebase) ──────────────────────────────────────────────────────────
let verifier: RecaptchaVerifier | null = null;
let confirmation: ConfirmationResult | null = null;

export async function sendOtp(e164: string, recaptchaContainer: HTMLElement): Promise<void> {
  const auth = await firebaseAuth();
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  verifier?.clear();
  verifier = new RecaptchaVerifier(auth, recaptchaContainer, { size: "invisible" });
  confirmation = await signInWithPhoneNumber(auth, e164, verifier);
}

export async function confirmOtp(code: string): Promise<void> {
  if (!confirmation) throw new Error("Request a code first");
  await confirmation.confirm(code);
  confirmation = null;
}
