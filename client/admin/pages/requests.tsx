"use client";

import { useTranslations } from "next-intl";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate } from "@/client/lib/format";
import { useEnum, useEnumOptions } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IRequestListResponse, IRequestResponse } from "@/client/lib/types";
import { DataTable, Empty, SelectField, StatusBadge } from "@/client/ui";
import { useProperty } from "../property-layout";

const statuses = ["open", "in_progress", "resolved", "rejected", "cancelled"];

export function RequestsPage() {
  const t = useTranslations("Requests");
  const c = useTranslations("Common");
  const en = useEnum();
  const options = useEnumOptions();
  const { apiPath, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20, status }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <SelectField label={c("status")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: c("allStatuses") }, ...options("status", statuses)]} width={200} />
      <DataTable<IRequestResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} />}
        columns={[
          { key: "t", header: t("request"), render: (r) => <Link href={to(`requests/${r.id}`)}>{r.title}</Link> },
          { key: "u", header: c("unit"), render: (r) => r.unitName ?? "—" },
          { key: "ty", header: c("type"), render: (r) => en("requestType", r.type) },
          { key: "p", header: t("priority"), render: (r) => <StatusBadge status={r.priority} /> },
          { key: "b", header: t("from"), render: (r) => r.requestedBy.displayName },
          { key: "c", header: t("created"), render: (r) => formatDate(r.createdAt) },
          { key: "s", header: c("status"), render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </Stack>
  );
}
