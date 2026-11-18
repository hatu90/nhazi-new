"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterListResponse, IMeterResponse, IServiceListResponse, IUnitListResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, Tag } from "@/client/ui";
import { text } from "@/client/ui/form";
import { FDate, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { BulkMetersForm } from "../bulk/bulk-meters-form";
import { useProperty } from "../property-layout";

export function MetersPage() {
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);
  const query = useGet<IMeterListResponse>(apiPath("/meters"), { page, pageSize: 20 }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end" gap={2}><Button label="Bulk add" variant="secondary" onClick={() => setBulk(true)} /><Button label="Add meter" onClick={() => setCreating(true)} /></HStack>}
      <DataTable<IMeterResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No meters" hint="Add a meter to a unit to record electricity or water readings." action={canManage && <Button label="Add a meter" onClick={() => setCreating(true)} />} />}
        columns={[
          { key: "name", header: "Meter", render: (m) => <HStack gap={2} align="center">{m.name}{m.removedAt && <Tag label="removed" />}</HStack> },
          { key: "unit", header: "Unit", render: (m) => m.unitName },
          { key: "service", header: "Service", render: (m) => m.serviceName },
          { key: "serial", header: "Serial", render: (m) => m.serialNumber ?? "—" },
          { key: "installed", header: "Installed", render: (m) => formatDate(m.installedAt) },
          { key: "go", header: "", align: "end", render: (m) => <Button label="Readings" size="sm" variant="ghost" href={to(`meters/${m.id}`)} /> },
        ]}
      />
      <Modal open={bulk} onClose={() => setBulk(false)} title="Bulk add meters">{bulk && <BulkMetersForm onDone={() => setBulk(false)} onCancel={() => setBulk(false)} />}</Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Add meter">{creating && <MeterForm onDone={() => setCreating(false)} />}</Modal>
    </Stack>
  );
}

interface MeterValues {
  unitId: string;
  serviceId: string;
  name: string;
  serialNumber: string;
  installedAt: string;
}

function MeterForm({ onDone }: { onDone: () => void }) {
  const { apiPath } = useProperty();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const services = useGet<IServiceListResponse>(apiPath("/services"), { usageBase: "meter", pageSize: 100 });
  const save = useSend<object>("POST", apiPath("/meters"), [apiPath("/meters")]);
  const form = useForm<MeterValues>({ defaultValues: { unitId: "", serviceId: "", name: "", serialNumber: "", installedAt: "" } });
  const submit = useSubmit(form, save, (v) => ({ unitId: v.unitId, serviceId: v.serviceId, name: v.name.trim(), serialNumber: text(v.serialNumber), installedAt: text(v.installedAt) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add meter" onCancel={onDone}>
      <FSelect control={form.control} name="unitId" label="Unit" required search options={(units.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} width="100%" />
      <FSelect control={form.control} name="serviceId" label="Service" required options={(services.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))} hint={services.data?.items.length === 0 ? "Create a metered service first (Services tab)." : undefined} width="100%" />
      <FText control={form.control} name="name" label="Name" placeholder="Electric meter" required width="100%" />
      <FText control={form.control} name="serialNumber" label="Serial number" width="100%" />
      <FDate control={form.control} name="installedAt" label="Installed on" width="100%" />
    </FormBody>
  );
}
