"use client";

import { useTranslations } from "next-intl";
import { useInvoiceTitle } from "@/client/lib/use-invoice-title";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum, useEnumOptions } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IInvoiceListResponse, IInvoiceResponse } from "@/client/lib/types";
import { DataTable, Empty, SelectField, StatusBadge } from "@/client/ui";
import { useLease } from "../lease-layout";

const statuses = ["pending", "partial", "paid", "cancelled"];

export function InvoicesPage() {
  const t = useTranslations("Invoices");
  const it = useInvoiceTitle();
  const c = useTranslations("Common");
  const en = useEnum();
  const options = useEnumOptions();
  const { apiPath, to } = useLease();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const query = useGet<IInvoiceListResponse>(apiPath("/invoices"), { page, pageSize: 20, status }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <SelectField label={c("status")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: c("allStatuses") }, ...options("status", statuses)]} width={200} />
      <DataTable<IInvoiceResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} />}
        columns={[
          { key: "t", header: t("invoice"), render: (i) => <Link href={to(`invoices/${i.id}`)}>{it(i.title)}</Link> },
          { key: "k", header: c("type"), render: (i) => en("invoiceKind", i.kind) },
          { key: "a", header: c("amount"), render: (i) => formatMoney(i.amount) },
          { key: "p", header: c("paid"), render: (i) => formatMoney(i.paidAmount) },
          { key: "d", header: c("due"), render: (i) => formatDate(i.dueDate) },
          { key: "s", header: c("status"), render: (i) => <StatusBadge status={i.status} /> },
        ]}
      />
    </Stack>
  );
}
