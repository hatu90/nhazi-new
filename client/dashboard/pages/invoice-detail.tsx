"use client";

import { useTranslations } from "next-intl";
import { useInvoiceTitle } from "@/client/lib/use-invoice-title";
import { ArrowLeft, Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IInvoiceDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSkeleton, Section, StatusBadge } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { useLease } from "../lease-layout";
import { ReportPaymentFields, useReportPaymentForm } from "./report-payment-form";
import { api } from "@/client/lib/api";

export function InvoiceDetailPage() {
  const t = useTranslations("Invoices");
  const it = useInvoiceTitle();
  const c = useTranslations("Common");
  const en = useEnum();
  const { invoiceId = "" } = useParams();
  const { apiPath, to } = useLease();
  const invoice = useGet<IInvoiceDetailResponse>(apiPath(`/invoices/${invoiceId}`));
  const [paying, setPaying] = useState(false);
  const payment = useReportPaymentForm({ owed: invoice.data ? invoice.data.amount - invoice.data.paidAmount : 0, open: paying, onDone: () => setPaying(false) });
  const openFile = async (path: string) => {
    const { url } = await api<{ url: string }>(apiPath("/files"), { query: { path } });
    window.open(url, "_blank", "noopener");
  };
  if (invoice.isPending) return <PageSkeleton />;
  if (invoice.error) return <ErrorBox error={invoice.error} retry={() => void invoice.refetch()} />;
  const inv = invoice.data;
  const owed = inv.amount - inv.paidAmount;
  const canReport = (inv.status === "pending" || inv.status === "partial") && owed > 0;
  return (
    <VStack gap={5}>
      <HStack><Button label={t("allInvoices")} icon={<ArrowLeft size={16} />} variant="ghost" size="sm" href={to("invoices")} /></HStack>
      <PageHeader title={it(inv.title)} subtitle={<HStack gap={2} align="center"><StatusBadge status={inv.status} /><Text color="secondary">{t("dueShort", { date: formatDate(inv.dueDate) })}</Text></HStack>} actions={canReport && <Button icon={<Plus size={16} />} variant="primary" label={t("addPayment")} onClick={() => setPaying(true)} />} />
      <Section title={t("summary")}><DefList items={[[c("type"), en("invoiceKind", inv.kind)], [c("total"), formatMoney(inv.amount)], [c("paid"), formatMoney(inv.paidAmount)], [t("outstanding"), formatMoney(inv.status === "cancelled" ? 0 : inv.amount - inv.paidAmount)]]} /></Section>
      <Section title={t("whatYouPay")}>
        <DataTable<IInvoiceDetailResponse["items"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.items, page: 1, pageSize: 1000, total: inv.items.length } }}
          empty={<Empty title={t("noLines")} />}
          columns={[{ key: "t", header: c("description"), render: (i) => it(i.title) }, { key: "k", header: c("type"), render: (i) => en("itemKind", i.kind) }, { key: "a", header: c("amount"), align: "end", render: (i) => formatMoney(i.amount) }]}
        />
      </Section>
      <Section title={t("payments")}>
        <DataTable<IInvoiceDetailResponse["payments"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.payments, page: 1, pageSize: 1000, total: inv.payments.length } }}
          empty={<Empty title={t("noPayments")} />}
          columns={[{ key: "d", header: t("paidOn"), render: (p) => formatDate(p.paidOn) }, { key: "m", header: t("method"), render: (p) => en("paymentMethod", p.method) }, { key: "a", header: c("amount"), align: "end", render: (p) => formatMoney(p.amount) }, { key: "s", header: c("status"), render: (p) => <StatusBadge status={p.status} /> }, { key: "e", header: t("attachment"), render: (p) => p.evidence.length ? <HStack gap={2}>{p.evidence.map((path, i) => <Button key={path} label={t("file", { n: i + 1 })} variant="ghost" size="sm" onClick={() => void openFile(path)} />)}</HStack> : "—" }]}
        />
      </Section>
      <Modal open={paying} onClose={() => setPaying(false)}>
        <form noValidate onSubmit={payment.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("report")} onOpenChange={(o) => { if (!o) setPaying(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ReportPaymentFields x={payment} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={payment.error} busy={payment.busy} submitLabel={t("sendForConfirmation")} onCancel={() => setPaying(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
