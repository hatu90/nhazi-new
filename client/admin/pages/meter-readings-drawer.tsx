"use client";

import { formatDate, formatDateTime } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMeterResponse, IReadingListResponse, IReadingResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty } from "@/client/ui";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { FormFooter } from "@/client/ui/rhf";
import { ReadingFields, useReadingForm } from "./reading-form";

/** Side drawer with a meter's readings and an inline form to record a new one. */
export function MeterReadingsDrawer({ meter, onClose }: { meter: IMeterResponse | null; onClose: () => void }) {
  const { role } = useProperty();
  return (
    <Drawer isOpen={!!meter} onOpenChange={(o) => !o && onClose()} width={520} label="Meter readings">
      {meter && (
        <VStack gap={5} padding={4}>
          <DrawerHeader title={meter.name} subtitle={`${meter.unitName} · ${meter.serviceName}`} onOpenChange={(o) => !o && onClose()} />
          <Body meter={meter} canAdd={role !== "viewer"} />
        </VStack>
      )}
    </Drawer>
  );
}

function Body({ meter, canAdd }: { meter: IMeterResponse; canAdd: boolean }) {
  const { apiPath } = useProperty();
  const [page, setPage] = useState(1);
  const reading = useReadingForm({ meterId: meter.id, onDone: () => setPage(1) });
  const readings = useGet<IReadingListResponse>(apiPath(`/meters/${meter.id}/readings`), { page, pageSize: 10 }, { keepPrevious: true });
  return (
    <VStack gap={5}>
      <DefList items={[["Serial number", meter.serialNumber], ["Installed", formatDate(meter.installedAt)], ["Max value", meter.maxValue]]} />
      {canAdd && (
        <VStack gap={2}>
          <Text weight="semibold">Record a reading</Text>
          <form noValidate onSubmit={reading.submit}>
            <VStack gap={4}>
              <ReadingFields x={reading} />
              <FormFooter error={reading.error} busy={reading.busy} submitLabel="Save reading" />
            </VStack>
          </form>
        </VStack>
      )}
      <DataTable<IReadingResponse>
        query={readings}
        paging={setPage}
        empty={<Empty title="No readings yet" />}
        columns={[
          { key: "date", header: "Read at", render: (r) => formatDateTime(r.readAt) },
          { key: "value", header: "Value", render: (r) => r.value },
          { key: "at", header: "Recorded", render: (r) => formatDateTime(r.createdAt) },
        ]}
      />
    </VStack>
  );
}
