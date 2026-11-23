"use client";

import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { enablePush, pushState } from "./push";

const ASKED_KEY = "nhazi.pushAsked";
const asked = {
  get: () => { try { return localStorage.getItem(ASKED_KEY) !== null; } catch { return true; } },
  set: () => { try { localStorage.setItem(ASKED_KEY, String(Date.now())); } catch { /* private mode */ } },
};

/**
 * Asks every signed-in user, once per browser, to turn on push. The browser's own permission dialog needs a click,
 * so we show our own card first; "Not now" is remembered and the toggle on the notifications page stays available.
 */
export function PushPrompt() {
  const t = useTranslations("Dashboard");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (asked.get()) return;
    void pushState().then((s) => setShow(s === "off" && Notification.permission === "default")).catch(() => {});
  }, []);
  if (!show) return null;

  const close = () => { asked.set(); setShow(false); };
  const accept = async () => {
    setBusy(true);
    try { await enablePush(); } catch { /* the toggle on the notifications page reports failures */ }
    close();
  };
  return (
    <div role="dialog" aria-label={t("push.promptTitle")} className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96">
      <div className="flex items-start gap-3">
        <Bell size={20} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <Text weight="semibold">{t("push.promptTitle")}</Text>
          <Text size="sm" color="secondary">{t("push.promptBody")}</Text>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" label={t("push.notNow")} onClick={close} />
        <Button variant="primary" label={t("push.enable")} isLoading={busy} clickAction={accept} />
      </div>
    </div>
  );
}
