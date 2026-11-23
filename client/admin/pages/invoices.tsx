"use client";

import { useTranslations } from "next-intl";
import { useInvoiceTitle } from "@/client/lib/use-invoice-title";
import { Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum, useEnumOptions } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IAdminInvoiceListResponse, IAdminInvoiceResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, SelectField, StatusBadge } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { InvoiceFields, useInvoiceForm } from "./invoice-form";

const statuses = ["pending", "partial", "paid", "cancelled"];

export function InvoicesPage() {
  const t = useTranslations("Invoices");
  const it = useInvoiceTitle();
  const c = useTranslations("Common");
  const en = useEnum();
  const options = useEnumOptions();
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const invoiceForm = useInvoiceForm({ open: creating, onDone: () => setCreating(false) });
  const query = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { page, pageSize: 20, status }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <SelectField label={c("status")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: c("allStatuses") }, ...options("status", statuses)]} width={200} />
        {canManage && <Button icon={<Plus size={16} />} variant="primary" label={t("newInvoice")} onClick={() => setCreating(true)} />}
      </HStack>
      <DataTable<IAdminInvoiceResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} />}
        columns={[
          { key: "t", header: t("invoice"), render: (i) => <Link href={to(`invoices/${i.id}`)}>{it(i.title)}</Link> },
          { key: "u", header: c("unit"), render: (i) => i.unitName },
          { key: "k", header: c("type"), render: (i) => en("invoiceKind", i.kind) },
          { key: "a", header: c("amount"), render: (i) => formatMoney(i.amount) },
          { key: "p", header: c("paid"), render: (i) => formatMoney(i.paidAmount) },
          { key: "d", header: c("due"), render: (i) => formatDate(i.dueDate) },
          { key: "s", header: c("status"), render: (i) => <StatusBadge status={i.status} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={invoiceForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("newInvoice")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><InvoiceFields x={invoiceForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={invoiceForm.error} busy={invoiceForm.busy} submitLabel={t("createInvoice")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}

