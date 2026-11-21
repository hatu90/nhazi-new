"use client";

import { useTranslations } from "next-intl";
import { useEnum } from "@/client/lib/use-enum";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvitationResponse, INotificationListResponse, INotificationResponse, IPaginated } from "@/client/lib/types";
import { ErrorBox } from "@/client/ui";

type Item = { type: "invitation"; id: string; invitation: IInvitationResponse } | { type: "notification"; id: string; notification: INotificationResponse };

/** One card that pages through everything waiting for the user: invitations, requests, invoices to pay, payments to confirm. */
export function NotificationsCard() {
  const t = useTranslations("Dashboard");
  const c = useTranslations("Common");
  const en = useEnum();
  const navigate = useNavigate();
  const invitations = useGet<IPaginated<IInvitationResponse>>("/api/me/invitations", { status: "pending", pageSize: 20 });
  const notifications = useGet<INotificationListResponse>("/api/me/notifications");
  const respond = useSend<{ id: string; decision: "accept" | "decline" }>("POST", (b) => `/api/me/invitations/${b.id}/${b.decision}`, ["/api/me", "/api/lease"]);
  const [index, setIndex] = useState(0);

  const items: Item[] = [
    ...(invitations.data?.items ?? []).map((invitation): Item => ({ type: "invitation", id: invitation.id, invitation })),
    ...(notifications.data?.items ?? []).map((notification): Item => ({ type: "notification", id: notification.id, notification })),
  ];
  const at = Math.min(index, Math.max(items.length - 1, 0));
  const current = items[at];

  const open = (n: INotificationResponse) => (n.area === "admin" ? window.location.assign(`/admin${n.path}`) : navigate(n.path));
  const decide = async (id: string, decision: "accept" | "decline") => {
    await respond.mutateAsync({ id, decision });
  };

  return (
    <VStack gap={3}>
      <Heading level={2}>{t("notifications")}</Heading>
      {!current ? (
        <Text color="secondary" size="sm">{invitations.isPending || notifications.isPending ? `${c("loading")}…` : t("caughtUp")}</Text>
      ) : (
        <Card padding={4}>
          <VStack gap={3}>
            <HStack justify="between" align="center" gap={3} wrap="wrap">
              <VStack gap={0.5}>
                {current.type === "invitation" ? (
                  <>
                    <Text weight="semibold">{current.invitation.property.name}{current.invitation.lease ? ` · ${current.invitation.lease.unitName}` : ""}</Text>
                    <Text size="sm" color="secondary">
                      {current.invitation.kind === "lease" ? t("invitedTenant", { name: current.invitation.invitedBy.displayName }) : t("invitedTeam", { name: current.invitation.invitedBy.displayName, role: en("role", current.invitation.role ?? "") })}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text weight="semibold">{current.notification.title}</Text>
                    <Text size="sm" color="secondary">{current.notification.description}</Text>
                  </>
                )}
              </VStack>
              {current.type === "invitation" ? (
                <HStack gap={2}>
                  <Button label={t("decline")} variant="secondary" isLoading={respond.isPending} clickAction={() => decide(current.id, "decline")} />
                  <Button variant="primary" label={t("accept")} isLoading={respond.isPending} clickAction={() => decide(current.id, "accept")} />
                </HStack>
              ) : (
                <Button label={t("view")} variant="secondary" onClick={() => open(current.notification)} />
              )}
            </HStack>
            <HStack justify="end" align="center" gap={2}>
              <Button label="←" variant="secondary" isDisabled={at === 0} onClick={() => setIndex(at - 1)} />
              <Text size="sm" color="secondary">{at + 1}/{items.length}</Text>
              <Button label="→" variant="secondary" isDisabled={at >= items.length - 1} onClick={() => setIndex(at + 1)} />
            </HStack>
          </VStack>
        </Card>
      )}
      {respond.error && <ErrorBox error={respond.error} />}
      {notifications.error && <ErrorBox error={notifications.error} retry={() => void notifications.refetch()} />}
    </VStack>
  );
}
