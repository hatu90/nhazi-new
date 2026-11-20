"use client";

import { formatDate, formatDateTime } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMeterResponse, IReadingListResponse, IReadingResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageSpinner, Section } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useParams } from "react-router";
import { useProperty } from "../property-layout";
import { ReadingForm } from "./reading-form";

export function MeterPage() {
  const { meterId = "" } = useParams();
  const { apiPath, role, to } = useProperty();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const meter = useGet<IMeterResponse>(apiPath(`/meters/${meterId}`));
  const readings = useGet<IReadingListResponse>(apiPath(`/meters/${meterId}/readings`), { page, pageSize: 20 }, { keepPrevious: true });

  if (meter.isPending) return <PageSpinner />;
  if (meter.error) return <ErrorBox error={meter.error} retry={() => void meter.refetch()} />;
  const m = meter.data;

  return (
    <VStack gap={5}>
      <HStack><Button label="All meters" variant="ghost" size="sm" href={to("meters")} /></HStack>
      <Section title={m.name} action={role !== "viewer" && <Button label="Record reading" size="sm" onClick={() => setAdding(true)} />}>
        <DefList items={[["Unit", m.unitName], ["Service", m.serviceName], ["Serial number", m.serialNumber], ["Installed", formatDate(m.installedAt)], ["Max value", m.maxValue]]} />
      </Section>
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
      <Modal open={adding} onClose={() => setAdding(false)} title="Record a reading">{adding && <ReadingForm meterId={meterId} onDone={() => setAdding(false)} />}</Modal>
    </VStack>
  );
}
