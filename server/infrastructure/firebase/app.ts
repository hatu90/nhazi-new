import { cert, getApps, initializeApp } from "firebase-admin/app";

/** The one firebase-admin app (ID-token verification + FCM). Credentials via FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, else GOOGLE_APPLICATION_CREDENTIALS. */
export function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (projectId && clientEmail && key) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") }) });
  }
  // Default credentials only exist on Google infrastructure or with GOOGLE_APPLICATION_CREDENTIALS; anywhere else a partial
  // config would fail later with an unhelpful "Unable to detect a Project Id", so say exactly what is missing.
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const missing = Object.entries({ FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key })
      .filter(([, v]) => !v)
      .map(([k]) => k);
    throw new Error(`Firebase Admin is not configured: missing ${missing.join(", ")}`);
  }
  return initializeApp();
}
