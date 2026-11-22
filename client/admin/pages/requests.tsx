"use client";

import { useTranslations } from "next-intl";
import { Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useEnumOptions } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IRequestListResponse } from "@/client/lib/types";
import { Empty, SelectField } from "@/client/ui";
import { RequestList } from "@/client/requests/request-list";
import { useProperty } from "../property-layout";

const statuses = ["open", "in_progress", "resolved", "rejected", "cancelled"];

export function RequestsPage() {
  const t = useTranslations("Requests");
  const c = useTranslations("Common");
  const options = useEnumOptions();
  const { apiPath, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20, status }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <SelectField label={c("status")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: c("allStatuses") }, ...options("status", statuses)]} width={200} />
      <RequestList query={query} paging={setPage} showRequester hrefFor={(r) => to(`requests/${r.id}`)} empty={<Empty title={t("empty")} />} />
    </Stack>
  );
}
