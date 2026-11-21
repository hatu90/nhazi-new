"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IAdminInvoiceDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSpinner, Section, StatusBadge, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { useProperty } from "../property-layout";
import { PaymentFields, usePaymentForm } from "./invoice-payment-form";

export function InvoiceDetailPage() {
  const confirm = useConfirm();
  const { invoiceId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const path = apiPath(`/invoices/${invoiceId}`);
  const invoice = useGet<IAdminInvoiceDetailResponse>(path);
  const cancel = useSend<undefined>("POST", `${path}/cancel`, [apiPath("/invoices")]);
  const [paying, setPaying] = useState(false);
  const paymentForm = usePaymentForm({ path, owed: invoice.data ? invoice.data.amount - invoice.data.paidAmount : 0, open: paying, onDone: () => setPaying(false) });
  const review = useSend<{ id: string; decision: "confirm" | "reject" }>("POST", (b) => `${path}/payments/${b.id}/${b.decision}`, [path, apiPath("/invoices"), apiPath("/stats")]);

  if (invoice.isPending) return <PageSpinner />;
  if (invoice.error) return <ErrorBox error={invoice.error} retry={() => void invoice.refetch()} />;
  const inv = invoice.data;
  const owed = inv.amount - inv.paidAmount;
  const open = inv.status === "pending" || inv.status === "partial";

  return (
    <VStack gap={5}>
      <HStack><Button label="All invoices" variant="ghost" size="sm" href={to("invoices")} /></HStack>
      <PageHeader
        title={inv.title}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={inv.status} /><Text color="secondary">{inv.unitName} · due {formatDate(inv.dueDate)}</Text></HStack>}
        actions={canManage && open && (
          <>
            <Button variant="primary" label="Record payment" onClick={() => setPaying(true)} />
            <Button label="Cancel invoice" variant="secondary" isLoading={cancel.isPending} onClick={() => confirm.ask({ title: "Cancel this invoice?", description: "The invoice is marked cancelled and can no longer be paid.", actionLabel: "Cancel invoice", onConfirm: () => cancel.mutateAsync(undefined) })} />
          </>
        )}
      />
      {cancel.error && <ErrorBox error={cancel.error} />}
      <Section title="Summary">
        <DefList items={[["Type", label(inv.kind)], ["Total", formatMoney(inv.amount)], ["Paid", formatMoney(inv.paidAmount)], ["Outstanding", formatMoney(inv.status === "cancelled" ? 0 : owed)]]} />
      </Section>
      <Section title="Lines">
        <DataTable<IAdminInvoiceDetailResponse["items"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.items.filter((i) => !i.voided), page: 1, pageSize: 1000, total: inv.items.length } }}
          empty={<Empty title="No lines" />}
          columns={[
            { key: "t", header: "Description", render: (i) => i.title },
            { key: "k", header: "Type", render: (i) => label(i.kind) },
            { key: "d", header: "Usage", render: (i) => (i.detail ? `${i.detail.quantity} × price → ${formatMoney(i.detail.calculatedAmount)}` : "") },
            { key: "a", header: "Amount", align: "end", render: (i) => formatMoney(i.amount) },
          ]}
        />
      </Section>
      <Section title="Payments">
        <DataTable<IAdminInvoiceDetailResponse["payments"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.payments, page: 1, pageSize: 1000, total: inv.payments.length } }}
          empty={<Empty title="No payments yet" />}
          columns={[
            { key: "d", header: "Paid on", render: (p) => formatDate(p.paidOn) },
            { key: "m", header: "Method", render: (p) => label(p.method) },
            { key: "r", header: "Reference", render: (p) => p.reference ?? "—" },
            { key: "a", header: "Amount", align: "end", render: (p) => formatMoney(p.amount) },
            { key: "s", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
            {
              key: "x",
              header: "",
              align: "end",
              render: (p) => canManage && p.status === "pending" && (
                <HStack gap={2} justify="end">
                  <Button label="Reject" size="sm" variant="secondary" isLoading={review.isPending} clickAction={async () => { await review.mutateAsync({ id: p.id, decision: "reject" }); }} />
                  <Button variant="primary" label="Confirm" size="sm" isLoading={review.isPending} clickAction={async () => { await review.mutateAsync({ id: p.id, decision: "confirm" }); }} />
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
            header={<DialogHeader title={"Record payment"} onOpenChange={(o) => { if (!o) setPaying(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><PaymentFields x={paymentForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={paymentForm.error} busy={paymentForm.busy} submitLabel={"Record payment"} onCancel={() => setPaying(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
