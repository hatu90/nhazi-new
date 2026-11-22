"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "react-router";
import { useGet } from "@/client/lib/hooks";
import type { INotificationListResponse } from "@/client/lib/types";
import { NotificationRow, usePendingInvitationIds } from "@/client/notifications/invitation-actions";
import { ErrorBox, Tag } from "@/client/ui";

/** Home page: pages through what is still unread. The full list (and history) lives under /dashboard/notifications. */
export function NotificationsCard() {
  const t = useTranslations("Dashboard");
  const c = useTranslations("Common");
  const list = useGet<INotificationListResponse>("/api/me/notifications", { unread: true, pageSize: 20 });
  const pending = usePendingInvitationIds();
  const [index, setIndex] = useState(0);

  const items = list.data?.items ?? [];
  const at = Math.min(index, Math.max(items.length - 1, 0));
  const current = items[at];

  return (
    <VStack gap={3}>
      <HStack gap={2} align="center" justify="between">
        <HStack gap={2} align="center">
          <Heading level={2}>{t("notifications")}</Heading>
          {(list.data?.unread ?? 0) > 0 && <Tag label={String(list.data?.unread)} tone="info" />}
        </HStack>
        <Link to="/notifications"><Text size="sm" color="secondary">{t("seeAll")}</Text></Link>
      </HStack>
      {!current ? (
        <Text color="secondary" size="sm">{list.isPending ? `${c("loading")}…` : t("caughtUp")}</Text>
      ) : (
        <Card padding={4}>
          <VStack gap={3}>
            <NotificationRow key={current.id} n={current} pendingInvitations={pending} />
            <HStack justify="end" align="center" gap={2}>
              <Button label="←" variant="secondary" isDisabled={at === 0} onClick={() => setIndex(at - 1)} />
              <Text size="sm" color="secondary">{at + 1}/{items.length}</Text>
              <Button label="→" variant="secondary" isDisabled={at >= items.length - 1} onClick={() => setIndex(at + 1)} />
            </HStack>
          </VStack>
        </Card>
      )}
      {list.error && <ErrorBox error={list.error} retry={() => void list.refetch()} />}
    </VStack>
  );
}
