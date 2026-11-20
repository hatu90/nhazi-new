"use client";

import { formatDate } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMeterListResponse, IMeterResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, Tag } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { BulkMetersForm } from "../bulk/bulk-meters-form";
import { useProperty } from "../property-layout";
import { MeterForm } from "./meter-form";

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

