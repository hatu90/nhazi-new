"use client";

import { useTranslations } from "next-intl";
import { Link } from "@astryxdesign/core/Link";
import { VStack } from "@astryxdesign/core/Stack";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IAdminInvoiceListResponse, IAdminInvoiceResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, Section, StatusBadge } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** Every invoice of the lease with what has been paid; open one to see its lines and payments. */
export function InvoicesTab({ leaseId }: { leaseId: string }) {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  const en = useEnum();
  const { apiPath, to } = useProperty();
  const invoices = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { leaseId, pageSize: 100 });
  const live = (invoices.data?.items ?? []).filter((i) => i.status !== "cancelled");
  const invoiced = live.reduce((s, i) => s + i.amount, 0);
  const paid = live.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <VStack gap={5}>
      <Section title={t("summary")}>
        <DefList items={[[t("invoiced"), formatMoney(invoiced)], [c("paid"), formatMoney(paid)], [t("outstanding"), formatMoney(invoiced - paid)]]} />
      </Section>
      <Section title={t("invoicesPayments")}>
        <DataTable<IAdminInvoiceResponse>
          query={invoices}
          empty={<Empty title={t("noInvoices")} />}
          columns={[
            { key: "t", header: t("invoice"), render: (i) => <Link href={to(`invoices/${i.id}`)}>{i.title}</Link> },
            { key: "k", header: c("type"), render: (i) => en("invoiceKind", i.kind) },
            { key: "a", header: c("amount"), render: (i) => formatMoney(i.amount) },
            { key: "p", header: c("paid"), render: (i) => formatMoney(i.paidAmount) },
            { key: "d", header: c("due"), render: (i) => formatDate(i.dueDate) },
            { key: "s", header: c("status"), render: (i) => <StatusBadge status={i.status} /> },
          ]}
        />
      </Section>
    </VStack>
  );
}
