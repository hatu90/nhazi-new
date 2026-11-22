"use client";

import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useGet, useSend } from "@/client/lib/hooks";
import type { INotificationListResponse, INotificationResponse } from "@/client/lib/types";
import { syncPush } from "./push";

const MENU_SIZE = 5;

/** Top-bar bell: unread count (refreshed every minute); opens a menu of the latest notifications and a "Show all" link. */
export function NotificationBell() {
  const t = useTranslations("Common");
  const td = useTranslations("Dashboard");
  const { data } = useGet<{ unread: number }>("/api/me/notifications/unread-count", undefined, { refetchInterval: 60_000 });
  const list = useGet<INotificationListResponse>("/api/me/notifications", { page: 1, pageSize: MENU_SIZE }, { refetchInterval: 60_000 });
  const read = useSend<{ id: string }>("POST", (b) => `/api/me/notifications/${b.id}/read`, ["/api/me/notifications"]);
  useEffect(() => { void syncPush().catch(() => {}); }, []);
  const unread = data?.unread ?? 0;

  // The bell sits outside the SPA routers, so open pages with a full-page navigation.
  const open = (n: INotificationResponse) => {
    if (!n.readAt) read.mutate({ id: n.id });
    window.location.assign(`${n.area === "admin" ? "/admin" : "/dashboard"}${n.path}`);
  };
  const items: DropdownMenuOption[] = [
    ...(list.data?.items ?? []).map((n): DropdownMenuOption => ({
      id: n.id,
      label: <span className={n.readAt ? undefined : "font-semibold"}>{n.title}</span>,
      description: n.body,
      endContent: n.readAt ? undefined : <span aria-label={td("unread")} className="size-2 rounded-full bg-[#357d9d]" />,
      onClick: () => open(n),
    })),
    ...(list.data && list.data.items.length === 0 ? [{ id: "empty", label: td("caughtUp"), isDisabled: true }] : []),
    { type: "divider" },
    { id: "all", label: td("showAll"), onClick: () => window.location.assign("/dashboard/notifications") },
  ];

  return (
    <DropdownMenu
      items={items}
      placement="below"
      alignment="end"
      renderTrigger={(props) => (
        <button type="button" {...props} aria-label={t("notifications", { count: unread })} className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-black/5 sm:size-9">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>
          )}
        </button>
      )}
    />
  );
}
