"use client";

import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { Bell, Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { enablePush, pushState } from "./push";

/** After "Not now" a card comes back once this long has passed. */
const REASK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const cooldown = (key: string) => ({
  active: () => {
    try {
      const at = Number(localStorage.getItem(key));
      return Number.isFinite(at) && at > 0 && Date.now() - at < REASK_AFTER_MS;
    } catch { return true; }
  },
  set: () => { try { localStorage.setItem(key, String(Date.now())); } catch { /* private mode */ } },
});
const pushAsked = cooldown("nhazi.pushAsked");
const installAsked = cooldown("nhazi.installAsked");

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Mode = "push" | "install" | "ios" | null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * One bottom card for signed-in users, in priority order: iOS "Add to Home Screen" hint (push only works from the
 * installed app there), the browser's install prompt (Android / desktop Chrome), then the push opt-in. "Not now" is
 * remembered for a week, then the card is allowed to come back.
 */
export function PushPrompt() {
  const t = useTranslations("Dashboard");
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const standalone = isStandalone();
    const onInstall = (e: Event) => {
      e.preventDefault(); // keep the event so our own card can trigger the browser's dialog
      setInstallEvent(e as InstallEvent);
      if (!installAsked.active()) setMode((m) => m ?? "install");
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    const onInstalled = () => { setInstallEvent(null); setMode(null); };
    window.addEventListener("appinstalled", onInstalled);

    if (!standalone && isIos()) {
      if (!installAsked.active()) setMode("ios");
    } else if (!pushAsked.active()) {
      void pushState()
        .then((s) => { if (!cancelled && s === "off" && Notification.permission === "default") setMode((m) => m ?? "push"); })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (!mode) return null;

  const close = () => {
    (mode === "push" ? pushAsked : installAsked).set();
    setMode(null);
  };
  const accept = async () => {
    setBusy(true);
    try {
      if (mode === "install" && installEvent) {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      } else if (mode === "push") {
        await enablePush();
      }
    } catch { /* the toggle on the notifications page reports push failures */ }
    setBusy(false);
    close();
  };

  const Icon = mode === "push" ? Bell : mode === "ios" ? Share : Download;
  const title = t(`push.${mode}Title`);
  const body = t(`push.${mode}Body`);
  return (
    <div role="dialog" aria-label={title} className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96">
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <Text weight="semibold">{title}</Text>
          <Text size="sm" color="secondary">{body}</Text>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" label={mode === "ios" ? t("push.gotIt") : t("push.notNow")} onClick={close} />
        {mode !== "ios" && <Button variant="primary" label={mode === "push" ? t("push.enable") : t("push.install")} isLoading={busy} clickAction={accept} />}
      </div>
    </div>
  );
}
