"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { ITenancyListResponse, ITenancySummaryResponse, IUnitListResponse, IUnitResponse } from "@/client/lib/types";
import { ErrorBox, Modal, PageSkeleton, Section, Tag } from "@/client/ui";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { BulkUnitsFields, useBulkUnitsForm } from "../bulk/bulk-units-form";
import { LeaseFields, useLeaseForm } from "../lease-form";
import { useProperty } from "../property-layout";
import { UnitFields, useUnitForm } from "./unit-form";

export const DAY = 86_400_000;

export type Occupancy = { kind: "terminating" | "endingSoon" | "occupied" | "upcoming" | "empty"; tone: "success" | "warning" | "info" | "neutral"; lease?: ITenancySummaryResponse; date?: string };

/** Empty, active, ending (terminated or ends within 30 days) or upcoming: from the leases that touch the unit. */
export function occupancyOf(leases: ITenancySummaryResponse[]): Occupancy {
  const active = leases.find((l) => l.status === "active");
  if (active) {
    const end = active.terminatedAt ?? active.endDate;
    if (active.terminatedAt) return { kind: "terminating", tone: "warning", lease: active, date: active.terminatedAt };
    if (end && new Date(end).getTime() - Date.now() <= 30 * DAY) return { kind: "endingSoon", tone: "warning", lease: active, date: end };
    return { kind: "occupied", tone: "success", lease: active, date: end ?? undefined };
  }
  const upcoming = leases.find((l) => l.status === "upcoming");
  if (upcoming) return { kind: "upcoming", tone: "info", lease: upcoming, date: upcoming.startDate };
  return { kind: "empty", tone: "neutral" };
}

export function UnitsByFloor() {
  const t = useTranslations("Units");
  const noteOf = (o: Occupancy) => {
    if (!o.date) return undefined;
    const date = formatDate(o.date);
    return o.kind === "endingSoon" ? t("endsOn", { date }) : o.kind === "upcoming" ? t("fromDate", { date }) : t("until", { date });
  };
  const { apiPath, to, canManage } = useProperty();
  const navigate = useNavigate();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { pageSize: 100 });
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  // the empty unit a lease is being added to
  const [leaseUnit, setLeaseUnit] = useState<IUnitResponse | null>(null);
  const unitForm = useUnitForm({ open: adding, onDone: () => setAdding(false) });
  const bulkForm = useBulkUnitsForm({ open: bulk, onDone: () => setBulk(false) });
  const leaseForm = useLeaseForm({ open: leaseUnit !== null, unitId: leaseUnit?.id, onDone: (id) => { setLeaseUnit(null); navigate(to(`leases/${id}`)); } });

  const floors = useMemo(() => {
    if (!units.data || !leases.data) return [];
    const byUnit = new Map<string, ITenancySummaryResponse[]>();
    for (const l of leases.data.items) byUnit.set(l.unitId, [...(byUnit.get(l.unitId) ?? []), l]);
    const byFloor = new Map<number, { unit: IUnitResponse; occ: Occupancy }[]>();
    for (const unit of units.data.items) byFloor.set(unit.floor, [...(byFloor.get(unit.floor) ?? []), { unit, occ: occupancyOf(byUnit.get(unit.id) ?? []) }]);
    return [...byFloor.entries()].sort(([a], [b]) => a - b);
  }, [units.data, leases.data]);

  if (units.isPending || leases.isPending) return <PageSkeleton />;
  const error = units.error ?? leases.error;
  if (error) return <ErrorBox error={error} retry={() => { void units.refetch(); void leases.refetch(); }} />;

  const actions = canManage && (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:grow sm:[&>*]:grow-0">
      <Button label={t("bulkTitle")} variant="secondary" onClick={() => setBulk(true)} />
      <Button icon={<Plus size={16} />} label={t("addUnit")} variant="primary" onClick={() => setAdding(true)} />
    </div>
  );

  return (
    <VStack gap={6}>
      {floors.length === 0 ? (
        <Section title={t("title")} action={actions}><Text color="secondary">{t("noUnits")}</Text></Section>
      ) : (
        <>
          {actions && <div className="flex justify-end">{actions}</div>}
          {floors.map(([floor, rows]) => (
            <VStack key={floor} gap={3}>
              <Heading level={2}>{t("floorN", { n: floor })}</Heading>
              <Grid columns={{ minWidth: 240 }} gap={3}>
                {rows.map(({ unit, occ }) => {
                  const summary = (
                    <VStack gap={1.5}>
                      <HStack justify="between" align="center" gap={2}><Heading level={3}>{unit.name}</Heading><Tag label={t(`occ.${occ.kind}`)} tone={occ.tone} /></HStack>
                      <Text size="sm" color="secondary">{occ.lease ? `${[...occ.lease.tenants.map((x) => x.displayName), ...occ.lease.members.filter((m) => !occ.lease!.tenants.some((x) => x.phoneNumber === m.phoneNumber)).map((m) => m.name)].join(", ") || t("noTenants")}${noteOf(occ) ? ` · ${noteOf(occ)}` : ""}` : `${unit.area} m² · ${unit.rentNegotiable ? t("negotiable") : formatMoney(unit.rentPrice)}`}</Text>
                    </VStack>
                  );
                  // an empty unit is not a link: it carries its own "Add lease" button (a button can't sit inside a clickable card)
                  if (!occ.lease && canManage) {
                    return (
                      <Card key={unit.id} padding={3}>
                        <VStack gap={3}>
                          {summary}
                          <Button icon={<Plus size={16} />} label={t("addLease")} size="sm" variant="secondary" onClick={() => setLeaseUnit(unit)} />
                        </VStack>
                      </Card>
                    );
                  }
                  return (
                    <ClickableCard key={unit.id} label={unit.name} padding={3} onClick={() => navigate(occ.lease ? to(`leases/${occ.lease.id}`) : to("units"))}>
                      {summary}
                    </ClickableCard>
                  );
                })}
              </Grid>
            </VStack>
          ))}
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)}>
        <form noValidate onSubmit={unitForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addUnit")} onOpenChange={(o) => { if (!o) setAdding(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><UnitFields x={unitForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={unitForm.error} busy={unitForm.busy} submitLabel={t("addUnit")} onCancel={() => setAdding(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={bulk} onClose={() => setBulk(false)}>
        <form noValidate onSubmit={bulkForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("bulkTitle")} onOpenChange={(o) => { if (!o) setBulk(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><BulkUnitsFields x={bulkForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={bulkForm.error} busy={bulkForm.busy} submitLabel={bulkForm.submitLabel} onCancel={() => setBulk(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={leaseUnit !== null} onClose={() => setLeaseUnit(null)}>
        <form noValidate onSubmit={leaseForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={leaseUnit ? t("newLeaseFor", { name: leaseUnit.name }) : t("newLease")} onOpenChange={(o) => { if (!o) setLeaseUnit(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><LeaseFields x={leaseForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={leaseForm.error} busy={leaseForm.busy} submitLabel={t("createDraft")} onCancel={() => setLeaseUnit(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
