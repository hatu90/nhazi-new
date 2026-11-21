"use client";

import { Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IAdminInvoiceListResponse, IAdminInvoiceResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, SelectField, StatusBadge } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { InvoiceFields, useInvoiceForm } from "./invoice-form";

const statuses = ["pending", "partial", "paid", "cancelled"].map((s) => ({ value: s, label: s }));

export function InvoicesPage() {
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const invoiceForm = useInvoiceForm({ open: creating, onDone: () => setCreating(false) });
  const query = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { page, pageSize: 20, status }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <SelectField label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, ...statuses]} width={200} />
        {canManage && <Button icon={<Plus size={16} />} variant="primary" label="New invoice" onClick={() => setCreating(true)} />}
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
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={invoiceForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"New invoice"} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><InvoiceFields x={invoiceForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={invoiceForm.error} busy={invoiceForm.busy} submitLabel={"Create invoice"} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}

