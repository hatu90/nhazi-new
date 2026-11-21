"use client";

import { useTranslations } from "next-intl";
import { formatDate, formatDateTime } from "@/client/lib/format";
import { useLocale } from "next-intl";
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
  const t = useTranslations("Meters");
  const { role } = useProperty();
  return (
    <Drawer isOpen={!!meter} onOpenChange={(o) => !o && onClose()} width={520} label={t("readings")}>
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
  const t = useTranslations("Meters");
  const locale = useLocale();
  const { apiPath } = useProperty();
  const [page, setPage] = useState(1);
  const reading = useReadingForm({ meterId: meter.id, onDone: () => setPage(1) });
  const readings = useGet<IReadingListResponse>(apiPath(`/meters/${meter.id}/readings`), { page, pageSize: 10 }, { keepPrevious: true });
  return (
    <VStack gap={5}>
      <DefList items={[[t("serial"), meter.serialNumber], [t("installed"), formatDate(meter.installedAt)], [t("maxValue"), meter.maxValue]]} />
      {canAdd && (
        <VStack gap={2}>
          <Text weight="semibold">{t("record")}</Text>
          <form noValidate onSubmit={reading.submit}>
            <VStack gap={4}>
              <ReadingFields x={reading} />
              <FormFooter error={reading.error} busy={reading.busy} submitLabel={t("saveReading")} />
            </VStack>
          </form>
        </VStack>
      )}
      <DataTable<IReadingResponse>
        query={readings}
        paging={setPage}
        empty={<Empty title={t("noReadings")} />}
        columns={[
          { key: "date", header: t("readAt"), render: (r) => formatDateTime(r.readAt, locale) },
          { key: "value", header: t("value"), render: (r) => r.value },
          { key: "at", header: t("recorded"), render: (r) => formatDateTime(r.createdAt, locale) },
        ]}
      />
    </VStack>
  );
}
