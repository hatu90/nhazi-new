"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useLocale, useTranslations } from "next-intl";
import { useNavigate } from "react-router";
import { formatDateTime } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { INotificationResponse, NotificationSeverity } from "@/client/lib/types";
import { Tag } from "@/client/ui";

const TONE = { info: "info", warning: "warning", urgent: "error" } as const satisfies Record<NotificationSeverity, string>;

/** Open the notification's page and mark it read. Landlord pages live in the other SPA (/admin), so those leave this one. */
export function useOpenNotification() {
  const navigate = useNavigate();
  const read = useSend<{ id: string }>("POST", (b) => `/api/me/notifications/${b.id}/read`, ["/api/me/notifications"]);
  return (n: INotificationResponse) => {
    if (!n.readAt) read.mutate({ id: n.id });
    if (n.area === "admin") window.location.assign(`/admin${n.path}`);
    else navigate(n.path);
  };
}

/** One notification: what it is about (tag), what happened, when, and the action. `actions` replaces the default "View". */
export function NotificationItem({ n, actions }: { n: INotificationResponse; actions?: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const open = useOpenNotification();
  return (
    <HStack justify="between" align="center" gap={3} wrap="wrap">
      <VStack gap={0.5}>
        <HStack gap={2} align="center">
          <Tag label={t(`notificationTarget.${n.targetType}`)} tone={TONE[n.severity]} />
          {!n.readAt && <span aria-label={t("unread")} className="size-2 rounded-full bg-[#357d9d]" />}
          <Text size="sm" color="secondary">{formatDateTime(n.createdAt, locale)}</Text>
        </HStack>
        <Text weight={n.readAt ? undefined : "semibold"}>{n.title}</Text>
        <Text size="sm" color="secondary">{n.body}</Text>
      </VStack>
      {actions ?? <Button label={t("view")} variant="secondary" onClick={() => open(n)} />}
    </HStack>
  );
}
