"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IPropertyStatsResponse, ITenancyListResponse, ITenancySummaryResponse, IUnitListResponse, IUnitResponse } from "@/client/lib/types";
import { ErrorBox, Kpi, PageSpinner, Section, Tag } from "@/client/ui";
import { useProperty } from "../property-layout";

const DAY = 86_400_000;

type Occupancy = { label: string; tone: "success" | "warning" | "info" | "neutral"; lease?: ITenancySummaryResponse; note?: string };

/** Empty, active, ending (terminated or ends within 30 days) or upcoming: from the leases that touch the unit. */
function occupancyOf(leases: ITenancySummaryResponse[]): Occupancy {
  const active = leases.find((l) => l.status === "active");
  if (active) {
    const end = active.terminatedAt ?? active.endDate;
    if (active.terminatedAt) return { label: "Terminating", tone: "warning", lease: active, note: `until ${formatDate(active.terminatedAt)}` };
    if (end && new Date(end).getTime() - Date.now() <= 30 * DAY) return { label: "Ending soon", tone: "warning", lease: active, note: `ends ${formatDate(end)}` };
    return { label: "Occupied", tone: "success", lease: active, note: end ? `until ${formatDate(end)}` : undefined };
  }
  const upcoming = leases.find((l) => l.status === "upcoming");
  if (upcoming) return { label: "Upcoming lease", tone: "info", lease: upcoming, note: `from ${formatDate(upcoming.startDate)}` };
  return { label: "Empty", tone: "neutral" };
}

function UnitsByFloor() {
  const { apiPath, to } = useProperty();
  const navigate = useNavigate();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { pageSize: 100 });

  const floors = useMemo(() => {
    if (!units.data || !leases.data) return [];
    const byUnit = new Map<string, ITenancySummaryResponse[]>();
    for (const l of leases.data.items) byUnit.set(l.unitId, [...(byUnit.get(l.unitId) ?? []), l]);
    const byFloor = new Map<number, { unit: IUnitResponse; occ: Occupancy }[]>();
    for (const unit of units.data.items) byFloor.set(unit.floor, [...(byFloor.get(unit.floor) ?? []), { unit, occ: occupancyOf(byUnit.get(unit.id) ?? []) }]);
    return [...byFloor.entries()].sort(([a], [b]) => a - b);
  }, [units.data, leases.data]);

  if (units.isPending || leases.isPending) return <PageSpinner />;
  const error = units.error ?? leases.error;
  if (error) return <ErrorBox error={error} retry={() => { void units.refetch(); void leases.refetch(); }} />;
  if (floors.length === 0) return <Section title="Units"><Text color="secondary">No units yet.</Text></Section>;

  return (
    <VStack gap={6}>
      {floors.map(([floor, rows]) => (
        <VStack key={floor} gap={3}>
          <Heading level={2}>{`Floor ${floor}`}</Heading>
          <Grid columns={{ minWidth: 240 }} gap={3}>
            {rows.map(({ unit, occ }) => (
              <ClickableCard key={unit.id} label={unit.name} padding={3} onClick={() => navigate(occ.lease ? to(`leases/${occ.lease.id}`) : to("units"))}>
                <VStack gap={1.5}>
                  <HStack justify="between" align="center" gap={2}><Heading level={3}>{unit.name}</Heading><Tag label={occ.label} tone={occ.tone} /></HStack>
                  <Text size="sm" color="secondary">{occ.lease ? `${occ.lease.tenants.map((t) => t.displayName).join(", ") || "No tenants"}${occ.note ? ` · ${occ.note}` : ""}` : `${unit.area} m² · ${unit.rentNegotiable ? "Negotiable" : formatMoney(unit.rentPrice)}`}</Text>
                </VStack>
              </ClickableCard>
            ))}
          </Grid>
        </VStack>
      ))}
    </VStack>
  );
}

function Kpis() {
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

/** Property dashboard: KPIs, then every unit grouped by floor with its occupancy. */
export function OverviewPage() {
  return (
    <VStack gap={6}>
      <Kpis />
      <UnitsByFloor />
    </VStack>
  );
}
