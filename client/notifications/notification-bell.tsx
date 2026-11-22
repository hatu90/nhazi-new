"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useGet } from "@/client/lib/hooks";
import { PlainAnchor } from "@/client/spa/plain-anchor";
import { syncPush } from "./push";

/** Top-bar bell: unread count (refreshed every minute) and a link to the full list in the tenant app. */
export function NotificationBell() {
  const t = useTranslations("Common");
  const { data } = useGet<{ unread: number }>("/api/me/notifications/unread-count", undefined, { refetchInterval: 60_000 });
  useEffect(() => { void syncPush().catch(() => {}); }, []);
  const unread = data?.unread ?? 0;
  return (
    <PlainAnchor href="/dashboard/notifications" aria-label={t("notifications", { count: unread })} className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5 sm:size-9">
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>
      )}
    </PlainAnchor>
  );
}
