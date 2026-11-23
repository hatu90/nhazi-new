"use client";

import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useTranslations } from "next-intl";
import { useNavigate } from "react-router";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IDashboardResponse, ILeaseListResponse } from "@/client/lib/types";
import { CardGridSkeleton, Empty, ErrorBox, Section, StatusBadge } from "@/client/ui";
import { ListCard, Row } from "./home-parts";

/** Leases the account rents: the numbers that need attention, then the leases themselves. */
export function TenantSection({ data }: { data: IDashboardResponse["tenant"] }) {
  const t = useTranslations("Dashboard");
  const navigate = useNavigate();
  const leases = useGet<ILeaseListResponse>("/api/lease", { pageSize: 50 });

  return (
    <Section title={t("tenant")} action={<Button label={t("findProperty")} variant="primary" onClick={() => window.location.assign("/find-property")} />}>
      <VStack gap={5}>
        <Grid columns={{ minWidth: 300 }} gap={4}>
          <ListCard title={t("periodsToClose")} total={data.periodsToClose.total} items={data.periodsToClose.items} empty={t("noPeriodsToClose")}
            row={(p) => <Row key={p.id} title={`${p.propertyName} · ${p.unitName}`} detail={t("endedOn", { date: formatDate(p.endDate) })} onClick={() => navigate(`/leases/${p.leaseId}`)} />} />
          <ListCard title={t("overdueInvoices")} total={data.overdueInvoices.total} items={data.overdueInvoices.items} empty={t("noOverdue")}
            row={(i) => <Row key={i.id} title={i.title} trailing={<Text weight="medium">{formatMoney(i.outstanding)}</Text>}
              detail={t("overdueDetail", { place: `${i.propertyName} · ${i.unitName}`, date: formatDate(i.dueDate) })} onClick={() => navigate(`/leases/${i.leaseId}/invoices/${i.id}`)} />} />
          <ListCard title={t("paymentsAwaiting")} total={data.payments.total} items={data.payments.items} empty={t("noPaymentsAwaiting")}
            row={(p) => <Row key={p.id} title={`${p.propertyName} · ${p.unitName}`} trailing={<Text weight="medium">{formatMoney(p.amount)}</Text>}
              detail={t("paidOn", { date: formatDate(p.paidOn) })} onClick={() => navigate(`/leases/${p.leaseId}/invoices/${p.invoiceId}`)} />} />
        </Grid>

        <VStack gap={3}>
          <Heading level={3}><span id="dashboard-leases">{t("leases")}</span></Heading>
          {leases.isPending ? <CardGridSkeleton /> : leases.error ? <ErrorBox error={leases.error} retry={() => void leases.refetch()} /> : leases.data.items.length === 0 ? (
            <Empty title={t("noLeases")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {leases.data.items.map((l) => (
                <ClickableCard key={l.id} onClick={() => navigate(`/leases/${l.id}`)} label={`${l.propertyName} ${l.unitName}`} padding={4}>
                  <VStack gap={2}>
                    <HStack justify="between" align="start" gap={2}><Heading level={3}>{l.unitName}</Heading><StatusBadge status={l.status} /></HStack>
                    <Text color="secondary" size="sm">{l.propertyName}</Text>
                    <HStack justify="between"><Text size="sm" color="secondary">{t("from", { date: formatDate(l.startDate) })}</Text><Text size="sm">{t("perMonth", { amount: formatMoney(l.currentRent) })}</Text></HStack>
                  </VStack>
                </ClickableCard>
              ))}
            </div>
          )}
        </VStack>
      </VStack>
    </Section>
  );
}
