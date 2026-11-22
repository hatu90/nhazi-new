import { cert, getApps, initializeApp } from "firebase-admin/app";

/** The one firebase-admin app (ID-token verification + FCM). Credentials via FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY, else GOOGLE_APPLICATION_CREDENTIALS. */
export function getFirebaseApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  return initializeApp(
    projectId && clientEmail && key
      ? { credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") }) }
      : undefined,
  );
}
