"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IAdminInvoiceDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSkeleton, Section, StatusBadge, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { useProperty } from "../property-layout";
import { PaymentFields, usePaymentForm } from "./invoice-payment-form";

export function InvoiceDetailPage() {
  const t = useTranslations("Invoices");
  const c = useTranslations("Common");
  const en = useEnum();
  const confirm = useConfirm();
  const { invoiceId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const path = apiPath(`/invoices/${invoiceId}`);
  const invoice = useGet<IAdminInvoiceDetailResponse>(path);
  const cancel = useSend<undefined>("POST", `${path}/cancel`, [apiPath("/invoices")]);
  const [paying, setPaying] = useState(false);
  const paymentForm = usePaymentForm({ path, owed: invoice.data ? invoice.data.amount - invoice.data.paidAmount : 0, open: paying, onDone: () => setPaying(false) });
  const review = useSend<{ id: string; decision: "confirm" | "reject" }>("POST", (b) => `${path}/payments/${b.id}/${b.decision}`, [path, apiPath("/invoices"), apiPath("/stats")]);

  if (invoice.isPending) return <PageSkeleton />;
  if (invoice.error) return <ErrorBox error={invoice.error} retry={() => void invoice.refetch()} />;
  const inv = invoice.data;
  const owed = inv.amount - inv.paidAmount;
  const open = inv.status === "pending" || inv.status === "partial";

  return (
    <VStack gap={5}>
      <HStack><Button label={t("allInvoices")} variant="ghost" size="sm" href={to("invoices")} /></HStack>
      <PageHeader
        title={inv.title}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={inv.status} /><Text color="secondary">{t("dueOn", { unit: inv.unitName, date: formatDate(inv.dueDate) })}</Text></HStack>}
        actions={canManage && open && (
          <>
            <Button variant="primary" label={t("recordPayment")} onClick={() => setPaying(true)} />
            <Button label={t("cancelInvoice")} variant="secondary" isLoading={cancel.isPending} onClick={() => confirm.ask({ title: t("cancelTitle"), description: t("cancelBody"), actionLabel: t("cancelInvoice"), onConfirm: () => cancel.mutateAsync(undefined) })} />
          </>
        )}
      />
      {cancel.error && <ErrorBox error={cancel.error} />}
      <Section title={t("summary")}>
        <DefList items={[[c("type"), en("invoiceKind", inv.kind)], [c("total"), formatMoney(inv.amount)], [c("paid"), formatMoney(inv.paidAmount)], [t("outstanding"), formatMoney(inv.status === "cancelled" ? 0 : owed)]]} />
      </Section>
      <Section title={t("lines")}>
        <DataTable<IAdminInvoiceDetailResponse["items"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.items.filter((i) => !i.voided), page: 1, pageSize: 1000, total: inv.items.length } }}
          empty={<Empty title={t("noLines")} />}
          columns={[
            { key: "t", header: c("description"), render: (i) => i.title },
            { key: "k", header: c("type"), render: (i) => en("itemKind", i.kind) },
            { key: "d", header: t("usage"), render: (i) => (i.detail ? t("usageDetail", { quantity: i.detail.quantity, amount: formatMoney(i.detail.calculatedAmount) }) : "") },
            { key: "a", header: c("amount"), align: "end", render: (i) => formatMoney(i.amount) },
          ]}
        />
      </Section>
      <Section title={t("payments")}>
        <DataTable<IAdminInvoiceDetailResponse["payments"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.payments, page: 1, pageSize: 1000, total: inv.payments.length } }}
          empty={<Empty title={t("noPayments")} />}
          columns={[
            { key: "d", header: t("paidOn"), render: (p) => formatDate(p.paidOn) },
            { key: "m", header: t("method"), render: (p) => en("paymentMethod", p.method) },
            { key: "r", header: t("reference"), render: (p) => p.reference ?? "—" },
            { key: "a", header: c("amount"), align: "end", render: (p) => formatMoney(p.amount) },
            { key: "s", header: c("status"), render: (p) => <StatusBadge status={p.status} /> },
            {
              key: "x",
              header: "",
              align: "end",
              render: (p) => canManage && p.status === "pending" && (
                <HStack gap={2} justify="end">
                  <Button label={c("reject")} size="sm" variant="secondary" isLoading={review.isPending} clickAction={async () => { await review.mutateAsync({ id: p.id, decision: "reject" }); }} />
                  <Button variant="primary" label={c("confirm")} size="md" isLoading={review.isPending} clickAction={async () => { await review.mutateAsync({ id: p.id, decision: "confirm" }); }} />
                </HStack>
              ),
            },
          ]}
        />
        {review.error && <ErrorBox error={review.error} />}
      </Section>
      <Modal open={paying} onClose={() => setPaying(false)}>
        <form noValidate onSubmit={paymentForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("recordPayment")} onOpenChange={(o) => { if (!o) setPaying(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><PaymentFields x={paymentForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={paymentForm.error} busy={paymentForm.busy} submitLabel={t("recordPayment")} onCancel={() => setPaying(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
