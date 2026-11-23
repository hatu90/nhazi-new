import { getMessaging } from "firebase-admin/messaging";
import type { IPushMessage, IPushSender } from "@/server/modules/notification/notification.push";
import { getFirebaseApp } from "./app";

const DEAD = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

/**
 * FCM push. DATA-ONLY on purpose: the service worker (public/sw.js) builds the notification itself, so the title / body /
 * click URL look the same on every browser and a click opens the right page. Never throws: a push is a bonus on top of the stored notification.
 */
export class FcmPushSender implements IPushSender {
  async send(tokens: string[], message: IPushMessage) {
    const invalidTokens: string[] = [];
    try {
      const messaging = getMessaging(getFirebaseApp());
      for (let i = 0; i < tokens.length; i += 500) {
        const chunk = tokens.slice(i, i + 500);
        const res = await messaging.sendEachForMulticast({
          tokens: chunk,
          data: { ...message.data, title: message.title, body: message.body },
          webpush: { headers: { Urgency: "high", TTL: String(60 * 60 * 24) } },
          android: { priority: "high" },
          apns: { headers: { "apns-priority": "10" } },
        });
        console.info(`[push] FCM sent: ${res.successCount} ok, ${res.failureCount} failed`);
        res.responses.forEach((r, idx) => {
          if (!r.success && r.error && DEAD.has(r.error.code)) invalidTokens.push(chunk[idx]);
          else if (!r.success) console.error("[push] send failed", r.error?.code);
        });
      }
    } catch (err) {
      console.error("[push] FCM unavailable", err instanceof Error ? err.message : err);
    }
    return { invalidTokens };
  }
}
