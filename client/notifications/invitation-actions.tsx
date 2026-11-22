"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Stack";
import { useTranslations } from "next-intl";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvitationResponse, INotificationResponse, IPaginated } from "@/client/lib/types";
import { ErrorBox } from "@/client/ui";
import { NotificationItem } from "./notification-item";

/** The ids of invitations still waiting for an answer: only those get Accept / Decline. */
export function usePendingInvitationIds() {
  const q = useGet<IPaginated<IInvitationResponse>>("/api/me/invitations", { status: "pending", pageSize: 100 });
  return new Set((q.data?.items ?? []).map((i) => i.id));
}

/** A notification row; an invitation that is still open also gets Accept / Decline. */
export function NotificationRow({ n, pendingInvitations }: { n: INotificationResponse; pendingInvitations: Set<string> }) {
  const t = useTranslations("Dashboard");
  const respond = useSend<{ id: string; decision: "accept" | "decline" }>("POST", (b) => `/api/me/invitations/${b.id}/${b.decision}`, ["/api/me", "/api/lease"]);
  const read = useSend<{ id: string }>("POST", (b) => `/api/me/notifications/${b.id}/read`, ["/api/me/notifications"]);
  const decide = async (decision: "accept" | "decline") => {
    await respond.mutateAsync({ id: n.targetId, decision });
    read.mutate({ id: n.id });
  };
  const answerable = n.event === "invitation.received" && pendingInvitations.has(n.targetId);
  return (
    <>
      <NotificationItem
        n={n}
        actions={answerable ? (
          <HStack gap={2}>
            <Button label={t("decline")} variant="secondary" isLoading={respond.isPending} clickAction={() => decide("decline")} />
            <Button label={t("accept")} variant="primary" isLoading={respond.isPending} clickAction={() => decide("accept")} />
          </HStack>
        ) : undefined}
      />
      {respond.error && <ErrorBox error={respond.error} />}
    </>
  );
}
