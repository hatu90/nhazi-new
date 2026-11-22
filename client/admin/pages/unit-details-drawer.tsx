"use client";

import { useTranslations } from "next-intl";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMeterListResponse, IMeterResponse, ITenancyListResponse, ITenancySummaryResponse, IUnitResponse } from "@/client/lib/types";
import { Link } from "@astryxdesign/core/Link";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { useState } from "react";
import { DataTable, DefList, Empty, Modal, Section, StatusBadge } from "@/client/ui";
import { FormFooter } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";
import { MeterFields, useMeterForm } from "./meter-form";

/** Side drawer with a unit's properties, its meters and its leases. */
export function UnitDetailsDrawer({ unit, onClose }: { unit: IUnitResponse | null; onClose: () => void }) {
  const t = useTranslations("Units");
  return (
    <Drawer isOpen={!!unit} onOpenChange={(o) => !o && onClose()} width={560} label={t("details")}>
      {unit && (
        <VStack gap={5} padding={4}>
          <DrawerHeader title={unit.name} onOpenChange={(o) => !o && onClose()} />
          <Body unit={unit} />
        </VStack>
      )}
    </Drawer>
  );
}

function Body({ unit }: { unit: IUnitResponse }) {
  const t = useTranslations("Units");
  const m = useTranslations("Meters");
  const l = useTranslations("Leases");
  const c = useTranslations("Common");
  const { apiPath, to, canManage } = useProperty();
  const [adding, setAdding] = useState(false);
  const form = useMeterForm({ unitId: unit.id, open: adding, onDone: () => setAdding(false) });
  const meters = useGet<IMeterListResponse>(apiPath("/meters"), { unitId: unit.id, page: 1, pageSize: 50, inService: "true" });
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { unitId: unit.id, page: 1, pageSize: 50 });
  return (
    <VStack gap={6}>
      <Section title={t("details")}><DefList items={[
        [t("floor"), unit.floor],
        [t("area"), `${unit.area} m²`],
        [t("bedrooms"), unit.bedrooms],
        [t("bathrooms"), unit.bathrooms],
        [t("rent"), unit.rentNegotiable ? t("negotiable") : formatMoney(unit.rentPrice)],
        [t("description"), unit.description],
      ]} /></Section>
      <Section title={t("meters")} action={canManage && <Button label={m("addMeter")} variant="secondary" onClick={() => setAdding(true)} />}>
        <DataTable<IMeterResponse>
          query={meters}
          empty={<Empty title={t("noMeters")} action={canManage && <Button label={m("addMeter")} variant="primary" onClick={() => setAdding(true)} />} />}
          columns={[
            { key: "name", header: m("meter"), render: (x) => x.name },
            { key: "service", header: m("service"), render: (x) => x.serviceName },
            { key: "serial", header: m("serial"), render: (x) => x.serialNumber ?? "—" },
          ]}
        />
      </Section>
      <Section title={t("leases")} action={<Link href={to("leases")}>{t("seeLeases")}</Link>}>
        <DataTable<ITenancySummaryResponse>
          query={leases}
          empty={<Empty title={t("noLeases")} />}
          columns={[
            { key: "period", header: l("period"), render: (x) => (
              <Link href={to(`leases/${x.id}`)}>{formatDate(x.startDate)}{x.endDate ? ` → ${formatDate(x.endDate)}` : ""}</Link>
            ) },
            { key: "tenants", header: l("tenants"), render: (x) => {
              const people = [
                ...x.tenants.map((t) => ({ key: t.accountId, name: t.displayName, phone: t.phoneNumber })),
                ...x.members.filter((m) => !x.tenants.some((t) => t.phoneNumber === m.phoneNumber)).map((m) => ({ key: m.id, name: m.name, phone: m.phoneNumber })),
              ];
              return (
                <>
                  {people.length ? (
                    <VStack gap={1}>
                      {people.map((p) => (
                        <VStack key={p.key} gap={0}>
                          <Text>{p.name}</Text>
                          {p.phone && <Text color="secondary">{p.phone}</Text>}
                        </VStack>
                      ))}
                    </VStack>
                  ) : "—"}
                </>
              );
            } },
            { key: "rent", header: l("rent"), render: (x) => formatMoney(x.currentRent) },
            { key: "status", header: c("status"), render: (x) => <StatusBadge status={x.status} /> },
          ]}
        />
      </Section>
      <Modal open={adding} onClose={() => setAdding(false)}>
        <form noValidate onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={m("addMeter")} onOpenChange={(o) => { if (!o) setAdding(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MeterFields x={form} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={form.error} busy={form.busy} submitLabel={m("addMeter")} onCancel={() => setAdding(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
