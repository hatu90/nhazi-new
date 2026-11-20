"use client";

import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IAdminInvoiceListResponse, IAdminInvoiceResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, SelectField, StatusBadge } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { InvoiceForm } from "./invoice-form";

const statuses = ["pending", "partial", "paid", "cancelled"].map((s) => ({ value: s, label: s }));

export function InvoicesPage() {
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const query = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { page, pageSize: 20, status }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <SelectField label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, ...statuses]} width={200} />
        {canManage && <Button label="New invoice" onClick={() => setCreating(true)} />}
      </HStack>
      <DataTable<IAdminInvoiceResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No invoices" hint="Invoices appear when a lease starts or ends, or when you create one." />}
        columns={[
          { key: "t", header: "Invoice", render: (i) => <Link href={to(`invoices/${i.id}`)}>{i.title}</Link> },
          { key: "u", header: "Unit", render: (i) => i.unitName },
          { key: "k", header: "Type", render: (i) => label(i.kind) },
          { key: "a", header: "Amount", render: (i) => formatMoney(i.amount) },
          { key: "p", header: "Paid", render: (i) => formatMoney(i.paidAmount) },
          { key: "d", header: "Due", render: (i) => formatDate(i.dueDate) },
          { key: "s", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)} title="New invoice">{creating && <InvoiceForm onDone={() => setCreating(false)} />}</Modal>
    </Stack>
  );
}

