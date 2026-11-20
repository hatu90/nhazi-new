"use client";

import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IAdminInvoiceListResponse, IAdminInvoiceResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, Section, StatusBadge } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** Every invoice of the lease with what has been paid; open one to see its lines and payments. */
export function InvoicesTab({ leaseId }: { leaseId: string }) {
  const { apiPath, to } = useProperty();
  const invoices = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { leaseId, pageSize: 100 });
  const live = (invoices.data?.items ?? []).filter((i) => i.status !== "cancelled");
  const invoiced = live.reduce((s, i) => s + i.amount, 0);
  const paid = live.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <VStack gap={5}>
      <Section title="Summary">
        <DefList items={[["Invoiced", formatMoney(invoiced)], ["Paid", formatMoney(paid)], ["Outstanding", formatMoney(invoiced - paid)]]} />
      </Section>
      <Section title="Invoices & payments">
        <DataTable<IAdminInvoiceResponse>
          query={invoices}
          empty={<Empty title="No invoices" hint="Invoices appear when the lease starts or ends, or when you create one." />}
          columns={[
            { key: "t", header: "Invoice", render: (i) => <Link href={to(`invoices/${i.id}`)}>{i.title}</Link> },
            { key: "k", header: "Type", render: (i) => label(i.kind) },
            { key: "a", header: "Amount", render: (i) => formatMoney(i.amount) },
            { key: "p", header: "Paid", render: (i) => formatMoney(i.paidAmount) },
            { key: "d", header: "Due", render: (i) => formatDate(i.dueDate) },
            { key: "s", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
          ]}
        />
      </Section>
    </VStack>
  );
}
