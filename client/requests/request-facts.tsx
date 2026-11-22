"use client";

import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatDate, formatDateTime } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import type { IRequestResponse } from "@/client/lib/types";
import { Section, StatusBadge } from "@/client/ui";
import { RequestTypeIcon } from "./type-icon";

/** The request's description, plus the meter readings of a close-period request. */
export function RequestBody({ r }: { r: IRequestResponse }) {
  const t = useTranslations("Requests");
  return (
    <Section title={t("description")}>
      <VStack gap={4}>
        {r.description ? <Text as="div" className="whitespace-pre-wrap break-words">{r.description}</Text> : <Text color="secondary">{t("noDescription")}</Text>}
        {r.details && r.details.readings.length > 0 && (
          <VStack gap={2}>
            <Text weight="semibold">{t("readings")}</Text>
            {r.details.readings.map((m) => (
              <div key={m.meterId} className="flex items-center justify-between gap-3 rounded-[var(--radius-container)] bg-[var(--color-background-card)] px-3 py-2">
                <Text>{m.serviceName}</Text>
                <Text size="sm" color="secondary">{m.openingValue} → <Text as="span" weight="semibold" color="primary">{m.value}</Text></Text>
              </div>
            ))}
          </VStack>
        )}
      </VStack>
    </Section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Text size="sm" color="secondary">{label}</Text>
      <Text size="sm" as="div" className="text-right">{children ?? "—"}</Text>
    </div>
  );
}

/** Side panel: type, status, priority, who, where and when. `viewer` decides which perspective's labels apply. */
export function RequestFacts({ r, showRequester }: { r: IRequestResponse; showRequester: boolean }) {
  const t = useTranslations("Requests");
  const c = useTranslations("Common");
  const en = useEnum();
  const locale = useLocale();
  return (
    <Section title={t("details")}>
      <VStack gap={3}>
        <div className="flex items-center gap-3">
          <RequestTypeIcon type={r.type} />
          <Text weight="semibold">{en("requestType", r.type)}</Text>
        </div>
        <Fact label={c("status")}><StatusBadge status={r.status} /></Fact>
        <Fact label={t("priority")}><StatusBadge status={r.priority} /></Fact>
        {showRequester && <Fact label={t("from")}>{r.requestedBy.displayName}</Fact>}
        {r.assignedTo && <Fact label={t("assignedTo")}>{r.assignedTo.displayName}</Fact>}
        {r.unitName && <Fact label={c("unit")}>{r.unitName}</Fact>}
        <Fact label={showRequester ? t("created") : t("sent")}>{formatDateTime(r.createdAt, locale)}</Fact>
        {r.requestedCloseDate && <Fact label={t("moveOut")}>{formatDate(r.requestedCloseDate)}</Fact>}
        {r.closedAt && <Fact label={t("closed")}>{formatDateTime(r.closedAt, locale)}</Fact>}
      </VStack>
    </Section>
  );
}
