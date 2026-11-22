/**
 * Web push through FCM. The service worker (public/sw.js) shows the notification; this file gets the device token and
 * tells the server about it. Needs NEXT_PUBLIC_FIREBASE_* plus NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID and
 * NEXT_PUBLIC_FIREBASE_VAPID_KEY (Firebase console -> Project settings -> Cloud Messaging -> Web Push certificates).
 */
import { firebaseApp, firebaseConfigured } from "@/client/auth/session";
import { api } from "@/client/lib/api";

const STORAGE_KEY = "nhazi.pushToken";
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

const store = {
  get: () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } },
  set: (v: string | null) => { try { if (v) localStorage.setItem(STORAGE_KEY, v); else localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ } },
};

/** Can this browser do web push at all? (iOS: only from an installed home-screen app.) */
export async function pushSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return false;
  const { isSupported } = await import("firebase/messaging");
  return isSupported();
}

export async function pushState(): Promise<PushState> {
  if (!firebaseConfigured || !vapidKey) return "unconfigured";
  if (!(await pushSupported())) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && store.get() ? "on" : "off";
}

async function fetchToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const { getMessaging, getToken } = await import("firebase/messaging");
  return getToken(getMessaging(await firebaseApp()), { vapidKey, serviceWorkerRegistration: registration });
}

/** Ask permission, get a token, register it. Resolves with the resulting state. */
export async function enablePush(): Promise<PushState> {
  const before = await pushState();
  if (before === "unsupported" || before === "unconfigured") return before;
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  const token = await fetchToken();
  await api("/api/me/push-tokens", { method: "POST", body: { token, platform: "web" } });
  store.set(token);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const token = store.get();
  if (token) {
    await api("/api/me/push-tokens", { method: "DELETE", body: { token } }).catch(() => {});
    const { getMessaging, deleteToken } = await import("firebase/messaging");
    await deleteToken(getMessaging(await firebaseApp())).catch(() => {});
  }
  store.set(null);
  return pushState();
}

/** Signed in and already allowed: FCM tokens rotate, so re-register the current one (cheap upsert). */
export async function syncPush(): Promise<void> {
  if ((await pushState()) !== "on") return;
  const token = await fetchToken();
  if (token !== store.get()) store.set(token);
  await api("/api/me/push-tokens", { method: "POST", body: { token, platform: "web" } });
}
