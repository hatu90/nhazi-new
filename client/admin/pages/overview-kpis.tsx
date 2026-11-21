"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IPropertyStatsResponse, ITenancyListResponse, IUnitListResponse } from "@/client/lib/types";
import { ErrorBox, Kpi } from "@/client/ui";
import { Grid } from "@astryxdesign/core/Grid";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";

export function Kpis() {
  const t = useTranslations("Overview");
  const { apiPath, to } = useProperty();
  const navigate = useNavigate();
  // same keys as UnitsByFloor: one request each, shared through the query cache
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { pageSize: 100 });
  const stats = useGet<IPropertyStatsResponse>(apiPath("/stats"));
  if (stats.error) return <ErrorBox error={stats.error} retry={() => void stats.refetch()} />;
  if (!stats.data || !units.data || !leases.data) return null;
  const { requests, payments, invoices } = stats.data;
  const occupied = new Set(leases.data.items.filter((l) => l.status === "active").map((l) => l.unitId)).size;
  return (
    <Grid columns={{ minWidth: 220 }} gap={3}>
      <Kpi title={t("units")} value={units.data.total} detail={t("occupied", { n: occupied })} onClick={() => navigate(to("units"))} />
      <Kpi title={t("maintenance")} value={requests.maintenanceOpen} detail={t("endLease", { n: requests.closeLeaseOpen })} onClick={() => navigate(to("requests"))} />
      <Kpi title={t("paymentsMonth")} value={formatMoney(payments.collectedThisMonth)} detail={t("awaiting", { n: payments.awaitingConfirmation })} onClick={() => navigate(to("invoices"))} />
      <Kpi title={t("overdue")} value={invoices.overdue} detail={t("dueMonth", { n: invoices.dueThisMonth })} onClick={() => navigate(to("invoices"))} />
    </Grid>
  );
}
