"use client";

import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Pagination } from "@astryxdesign/core/Pagination";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse, IDashboardResponse } from "@/client/lib/types";
import { useEnum } from "@/client/lib/use-enum";
import { CardGridSkeleton, Empty, ErrorBox, Section, Tag } from "@/client/ui";
import { ListCard, Row } from "./home-parts";

// the admin app is a separate SPA, so these are full navigations
const admin = (propertyId: string, path = "") => window.location.assign(`/admin/properties/${propertyId}${path}`);

/** Properties the account manages: the numbers that need attention, then the properties themselves. */
export function ManagementSection({ data, onCreate }: { data: IDashboardResponse["management"]; onCreate: () => void }) {
  const t = useTranslations("Dashboard");
  const en = useEnum();
  const [page, setPage] = useState(1);
  const properties = useGet<IAdminPropertyListResponse>("/api/admin/properties", { page, pageSize: 6 }, { keepPrevious: true });

  return (
    <Section title={t("management")} action={<Button icon={<Plus size={16} />} label={t("newProperty")} variant="primary" onClick={onCreate} />}>
      <VStack gap={5}>
        <Grid columns={{ minWidth: 300 }} gap={4}>
          <ListCard title={t("periodsToClose")} total={data.periodsToClose.total} items={data.periodsToClose.items} empty={t("noPeriodsToClose")}
            row={(p) => <Row key={p.id} title={`${p.propertyName} · ${p.unitName}`} detail={t("endedOn", { date: formatDate(p.endDate) })} onClick={() => admin(p.propertyId, `/leases/${p.leaseId}`)} />} />
          <ListCard title={t("requests")} total={data.requests.total} items={data.requests.items} empty={t("noRequests")}
            row={(r) => <Row key={r.id} title={r.title} trailing={<Tag label={en("status", r.status)} tone={r.priority === "urgent" ? "error" : r.priority === "high" ? "warning" : "neutral"} />}
              detail={`${r.propertyName}${r.unitName ? ` · ${r.unitName}` : ""} · ${en("requestType", r.type)}`} onClick={() => admin(r.propertyId, `/requests/${r.id}`)} />} />
          <ListCard title={t("overdueInvoices")} total={data.overdueInvoices.total} items={data.overdueInvoices.items} empty={t("noOverdue")}
            row={(i) => <Row key={i.id} title={i.title} trailing={<Text weight="medium">{formatMoney(i.outstanding)}</Text>}
              detail={t("overdueDetail", { place: `${i.propertyName} · ${i.unitName}`, date: formatDate(i.dueDate) })} onClick={() => admin(i.propertyId, `/invoices/${i.id}`)} />} />
          <ListCard title={t("paymentsToConfirm")} total={data.payments.total} items={data.payments.items} empty={t("noPayments")}
            row={(p) => <Row key={p.id} title={`${p.propertyName} · ${p.unitName}`} trailing={<Text weight="medium">{formatMoney(p.amount)}</Text>}
              detail={t("paidOn", { date: formatDate(p.paidOn) })} onClick={() => admin(p.propertyId, `/invoices/${p.invoiceId}`)} />} />
        </Grid>

        <VStack gap={3}>
          <Heading level={3}><span id="dashboard-properties">{t("properties")}</span></Heading>
          {properties.isPending ? <CardGridSkeleton /> : properties.error ? <ErrorBox error={properties.error} retry={() => void properties.refetch()} /> : properties.data.items.length === 0 ? (
            <Empty title={t("noProperties")} />
          ) : (
            <VStack gap={4}>
              <div className="grid gap-4 sm:grid-cols-2">
                {properties.data.items.map((p) => (
                  <ClickableCard key={p.id} onClick={() => admin(p.id)} label={p.name} padding={4}>
                    <VStack gap={2}>
                      <HStack justify="between" align="start" gap={2}><Heading level={3}>{p.name}</Heading><Tag label={en("role", p.role)} tone="info" /></HStack>
                      <Text color="secondary" size="sm">{p.street}, {p.ward.name}, {p.province.name}</Text>
                      <Text size="sm" color="secondary">{en("category", p.category)} · {t("units", { count: p.unitCount })}</Text>
                    </VStack>
                  </ClickableCard>
                ))}
              </div>
              {properties.data.total > properties.data.pageSize && <HStack justify="end"><Pagination page={properties.data.page} onChange={setPage} totalItems={properties.data.total} pageSize={properties.data.pageSize} /></HStack>}
            </VStack>
          )}
        </VStack>
      </VStack>
    </Section>
  );
}
