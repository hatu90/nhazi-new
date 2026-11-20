"use client";

import { formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IPropertyStatsResponse, ITenancyListResponse, IUnitListResponse } from "@/client/lib/types";
import { ErrorBox, Kpi } from "@/client/ui";
import { Grid } from "@astryxdesign/core/Grid";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";

export function Kpis() {
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
      <Kpi title="Units" value={units.data.total} detail={`${occupied} occupied`} onClick={() => navigate(to("units"))} />
      <Kpi title="Maintenance requests" value={requests.maintenanceOpen} detail={`${requests.closeLeaseOpen} lease termination ${requests.closeLeaseOpen === 1 ? "request" : "requests"}`} onClick={() => navigate(to("requests"))} />
      <Kpi title="Payments this month" value={formatMoney(payments.collectedThisMonth)} detail={`${payments.awaitingConfirmation} awaiting confirmation`} onClick={() => navigate(to("invoices"))} />
      <Kpi title="Overdue invoices" value={invoices.overdue} detail={`${invoices.dueThisMonth} invoices due this month`} onClick={() => navigate(to("invoices"))} />
    </Grid>
  );
}
