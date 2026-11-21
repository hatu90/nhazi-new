"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatDateTime } from "@/client/lib/format";
import { useLocale } from "next-intl";
import { useGet } from "@/client/lib/hooks";
import type { IMeterResponse, IReadingListResponse, IReadingResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageSpinner, Section } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useParams } from "react-router";
import { useProperty } from "../property-layout";
import { ReadingFields, useReadingForm } from "./reading-form";

export function MeterPage() {
  const t = useTranslations("Meters");
  const c = useTranslations("Common");
  const locale = useLocale();
  const { meterId = "" } = useParams();
  const { apiPath, role, to } = useProperty();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const readingForm = useReadingForm({ meterId, open: adding, onDone: () => setAdding(false) });
  const meter = useGet<IMeterResponse>(apiPath(`/meters/${meterId}`));
  const readings = useGet<IReadingListResponse>(apiPath(`/meters/${meterId}/readings`), { page, pageSize: 20 }, { keepPrevious: true });

  if (meter.isPending) return <PageSpinner />;
  if (meter.error) return <ErrorBox error={meter.error} retry={() => void meter.refetch()} />;
  const m = meter.data;

  return (
    <VStack gap={5}>
      <HStack><Button label={t("allMeters")} variant="ghost" size="sm" href={to("meters")} /></HStack>
      <Section title={m.name} action={role !== "viewer" && <Button variant="primary" label={t("recordReading")} size="sm" onClick={() => setAdding(true)} />}>
        <DefList items={[[c("unit"), m.unitName], [t("service"), m.serviceName], [t("serial"), m.serialNumber], [t("installed"), formatDate(m.installedAt)], [t("maxValue"), m.maxValue]]} />
      </Section>
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
      <Modal open={adding} onClose={() => setAdding(false)}>
        <form noValidate onSubmit={readingForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("recordTitle")} onOpenChange={(o) => { if (!o) setAdding(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ReadingFields x={readingForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={readingForm.error} busy={readingForm.busy} submitLabel={t("saveReading")} onCancel={() => setAdding(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
