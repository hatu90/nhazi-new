"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Pagination } from "@astryxdesign/core/Pagination";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useGet, useSend } from "@/client/lib/hooks";
import type { INotificationListResponse } from "@/client/lib/types";
import { NotificationRow, usePendingInvitationIds } from "@/client/notifications/invitation-actions";
import { disablePush, enablePush, pushState, type PushState } from "@/client/notifications/push";
import { Empty, ErrorBox, ListSkeleton, PageHeader } from "@/client/ui";

/** Every notification (newest first), mark all read, and the switch for push notifications on this device. */
export function NotificationsPage() {
  const t = useTranslations("Dashboard");
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useGet<INotificationListResponse>("/api/me/notifications", { page, pageSize: 20, unread: unreadOnly || undefined }, { keepPrevious: true });
  const pending = usePendingInvitationIds();
  const readAll = useSend("POST", "/api/me/notifications/read-all", ["/api/me/notifications"]);

  return (
    <VStack gap={4}>
      <PageHeader
        title={t("notifications")}
        subtitle={list.data ? t("unreadCount", { count: list.data.unread }) : undefined}
        actions={<>
          <Button label={unreadOnly ? t("showAll") : t("unreadOnly")} variant="secondary" onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }} />
          <Button label={t("markAllRead")} variant="secondary" isDisabled={!list.data?.unread} isLoading={readAll.isPending} clickAction={async () => { await readAll.mutateAsync(undefined); }} />
        </>}
      />
      <PushToggle />
      {list.isPending ? <ListSkeleton /> : list.error ? <ErrorBox error={list.error} retry={() => void list.refetch()} /> : list.data.items.length === 0 ? (
        <Empty title={t("caughtUp")} />
      ) : (
        <VStack gap={3}>
          {list.data.items.map((n) => (
            <Card key={n.id} padding={4}><NotificationRow n={n} pendingInvitations={pending} /></Card>
          ))}
          {list.data.total > list.data.pageSize && <HStack justify="end"><Pagination page={list.data.page} onChange={setPage} totalItems={list.data.total} pageSize={list.data.pageSize} /></HStack>}
        </VStack>
      )}
    </VStack>
  );
}

/** Turn push on / off for this browser or installed app. */
function PushToggle() {
  const t = useTranslations("Dashboard");
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { void pushState().then(setState); }, []);
  if (state === null) return null;
  if (state === "unconfigured") return null;

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card padding={4}>
      <HStack justify="between" align="center" gap={3} wrap="wrap">
        <VStack gap={0.5}>
          <Text weight="semibold">{t("push.title")}</Text>
          <Text size="sm" color="secondary">{failed ? t("push.failed") : t(`push.${state}`)}</Text>
        </VStack>
        {(state === "on" || state === "off") && (
          <Button label={state === "on" ? t("push.disable") : t("push.enable")} variant={state === "on" ? "secondary" : "primary"} isLoading={busy} clickAction={toggle} />
        )}
      </HStack>
    </Card>
  );
}
