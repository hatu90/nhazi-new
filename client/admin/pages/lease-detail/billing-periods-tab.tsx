"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";

import { ClosePeriodFields, useClosePeriodForm } from "@/client/billing/close-period-form";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IBillingPeriodDetailResponse, IBillingPeriodListResponse, IBillingPeriodResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Section, StatusBadge } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** The lease's billing periods, the running one highlighted and closable (with the meter readings). */
export function BillingPeriodsTab({ leaseId }: { leaseId: string }) {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  const { apiPath, canManage } = useProperty();
  const periods = useGet<IBillingPeriodListResponse>(apiPath("/billing-periods"), { leaseId, pageSize: 100 });
  const [closing, setClosing] = useState<IBillingPeriodResponse | null>(null);
  const detail = useGet<IBillingPeriodDetailResponse>(apiPath(`/billing-periods/${closing?.id}`), undefined, { enabled: !!closing });
  const meters = (detail.data?.usages ?? []).filter((u) => u.usageBase === "meter" && u.meterId).map((u) => ({ meterId: u.meterId!, serviceName: u.serviceName, openingValue: u.openingReading?.value ?? 0 }));
  const closeForm = useClosePeriodForm({ path: apiPath(`/billing-periods/${closing?.id}/close`), invalidate: [apiPath("/billing-periods"), apiPath("/invoices"), apiPath("/leases")], period: closing ?? undefined, meters, askNextEnd: true, open: !!closing && !!detail.data, onDone: () => setClosing(null) });
  return (
    <Section title={t("periodsTitle")}>
      <DataTable<IBillingPeriodResponse>
        query={periods}
        empty={<Empty title={t("noPeriods")} />}
        columns={[
          {
            key: "p",
            header: t("period"),
            render: (b) => (
              <HStack gap={2} align="center">
                <Text weight={b.status === "active" ? "semibold" : undefined}>{formatDate(b.startDate)} → {formatDate(b.endDate)}</Text>
                {b.status === "active" && <Badge variant="info" label={t("current")} />}
              </HStack>
            ),
          },
          { key: "s", header: c("status"), render: (b) => <StatusBadge status={b.status} /> },
          { key: "r", header: t("monthlyRent"), align: "end", render: (b) => formatMoney(b.rentAmount) },
          { key: "a", header: "", align: "end", render: (b) => (b.status === "active" && canManage ? <Button label={t("closePeriod")} size="sm" variant="secondary" onClick={() => setClosing(b)} /> : null) },
        ]}
      />
      <Modal open={!!closing} onClose={() => setClosing(null)}>
        <form noValidate onSubmit={closeForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("closeTitle")} onOpenChange={(o) => { if (!o) setClosing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}>{detail.error ? <ErrorBox error={detail.error} retry={() => void detail.refetch()} /> : !detail.data ? <Text color="secondary">{c("loading")}…</Text> : <ClosePeriodFields x={closeForm} />}</LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={closeForm.error} busy={closeForm.busy || !detail.data} submitLabel={t("closePeriod")} onCancel={() => setClosing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Section>
  );
}
