"use client";

import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IInvoiceListResponse, IInvoiceResponse } from "@/client/lib/types";
import { DataTable, Empty, SelectField, StatusBadge } from "@/client/ui";
import { useLease } from "../lease-layout";

const statuses = ["pending", "partial", "paid", "cancelled"].map((s) => ({ value: s, label: s }));

export function InvoicesPage() {
  const { apiPath, to } = useLease();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useGet<IInvoiceListResponse>(apiPath("/invoices"), { page, pageSize: 20, status }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <SelectField label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, ...statuses]} width={200} />
      <DataTable<IInvoiceResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No invoices" hint="Invoices from your landlord appear here." />}
        columns={[
          { key: "t", header: "Invoice", render: (i) => <Link href={to(`invoices/${i.id}`)}>{i.title}</Link> },
          { key: "k", header: "Type", render: (i) => label(i.kind) },
          { key: "a", header: "Amount", render: (i) => formatMoney(i.amount) },
          { key: "p", header: "Paid", render: (i) => formatMoney(i.paidAmount) },
          { key: "d", header: "Due", render: (i) => formatDate(i.dueDate) },
          { key: "s", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
        ]}
      />
    </Stack>
  );
}
