"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Pagination } from "@astryxdesign/core/Pagination";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Calendar, DoorOpen, User } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "next-intl";
import { formatDate } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import type { IRequestListResponse, IRequestResponse } from "@/client/lib/types";
import { ErrorBox, PageSpinner, StatusBadge } from "@/client/ui";
import { RequestTypeIcon } from "./type-icon";

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <HStack gap={1} align="center">
      <span className="inline-flex text-[var(--color-text-secondary)]">{icon}</span>
      <Text size="sm" color="secondary">{children}</Text>
    </HStack>
  );
}

function RequestCard({ r, href, showRequester }: { r: IRequestResponse; href: string; showRequester: boolean }) {
  const en = useEnum();
  const navigate = useNavigate();
  const closed = r.status === "resolved" || r.status === "rejected" || r.status === "cancelled";
  return (
    <ClickableCard label={r.title} padding={4} onClick={() => navigate(href)}>
      <HStack gap={3} align="start">
        <RequestTypeIcon type={r.type} />
        <VStack gap={2} className="min-w-0 flex-1">
          <HStack justify="between" align="start" gap={3} wrap="wrap">
            <VStack gap={0.5} className="min-w-0 flex-1">
              <Text weight="semibold" as="div" className="truncate">{r.title}</Text>
              <Text size="sm" color="secondary">{en("requestType", r.type)}</Text>
            </VStack>
            <HStack gap={2} align="center">
              {!closed && r.priority !== "normal" && <StatusBadge status={r.priority} />}
              <StatusBadge status={r.status} />
            </HStack>
          </HStack>
          {r.description && <Text size="sm" color="secondary" as="div" className="line-clamp-2">{r.description}</Text>}
          <HStack gap={4} wrap="wrap">
            <Meta icon={<Calendar size={14} />}>{formatDate(r.createdAt)}</Meta>
            {showRequester && <Meta icon={<User size={14} />}>{r.requestedBy.displayName}</Meta>}
            {r.unitName && <Meta icon={<DoorOpen size={14} />}>{r.unitName}</Meta>}
          </HStack>
        </VStack>
      </HStack>
    </ClickableCard>
  );
}

/** Card list of requests with loading / error / empty states and pagination. Shared by the tenant and admin pages. */
export function RequestList({
  query,
  hrefFor,
  empty,
  paging,
  showRequester = false,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown; data?: IRequestListResponse };
  hrefFor: (r: IRequestResponse) => string;
  empty: ReactNode;
  paging: (page: number) => void;
  showRequester?: boolean;
}) {
  const t = useTranslations("Requests");
  const { isPending, error, data } = query;
  if (isPending) return <PageSpinner />;
  if (error) return <ErrorBox error={error} retry={() => void query.refetch()} />;
  if (!data || data.items.length === 0) return <>{empty}</>;
  return (
    <VStack gap={3}>
      <Text size="sm" color="secondary">{t("count", { count: data.total })}</Text>
      {data.items.map((r) => <RequestCard key={r.id} r={r} href={hrefFor(r)} showRequester={showRequester} />)}
      {data.total > data.pageSize && (
        <HStack justify="end"><Pagination page={data.page} onChange={paging} totalItems={data.total} pageSize={data.pageSize} /></HStack>
      )}
    </VStack>
  );
}
