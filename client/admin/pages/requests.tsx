"use client";

import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IRequestListResponse, IRequestResponse } from "@/client/lib/types";
import { DataTable, Empty, SelectField, StatusBadge } from "@/client/ui";
import { useProperty } from "../property-layout";

const statuses = ["open", "in_progress", "resolved", "rejected", "cancelled"].map((s) => ({ value: s, label: label(s) }));

export function RequestsPage() {
  const { apiPath, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20, status }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <SelectField label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, ...statuses]} width={200} />
      <DataTable<IRequestResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No requests" hint="Repair and move-out requests from tenants show up here." />}
        columns={[
          { key: "t", header: "Request", render: (r) => <Link href={to(`requests/${r.id}`)}>{r.title}</Link> },
          { key: "u", header: "Unit", render: (r) => r.unitName ?? "—" },
          { key: "ty", header: "Type", render: (r) => label(r.type) },
          { key: "p", header: "Priority", render: (r) => <StatusBadge status={r.priority} /> },
          { key: "b", header: "From", render: (r) => r.requestedBy.displayName },
          { key: "c", header: "Created", render: (r) => formatDate(r.createdAt) },
          { key: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </Stack>
  );
}
