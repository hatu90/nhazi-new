"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvoiceDetailResponse, PaymentMethod } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSpinner, Section, StatusBadge } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useLease } from "../lease-layout";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const { apiPath, to } = useLease();
  const invoice = useGet<IInvoiceDetailResponse>(apiPath(`/invoices/${invoiceId}`));
  const [paying, setPaying] = useState(false);
  if (invoice.isPending) return <PageSpinner />;
  if (invoice.error) return <ErrorBox error={invoice.error} retry={() => void invoice.refetch()} />;
  const inv = invoice.data;
  const owed = inv.amount - inv.paidAmount;
  const canReport = (inv.status === "pending" || inv.status === "partial") && owed > 0;
  return (
    <VStack gap={5}>
      <HStack><Button label="All invoices" variant="ghost" size="sm" href={to("invoices")} /></HStack>
      <PageHeader title={inv.title} subtitle={<HStack gap={2} align="center"><StatusBadge status={inv.status} /><Text color="secondary">due {formatDate(inv.dueDate)}</Text></HStack>} actions={canReport && <Button label="I've paid" onClick={() => setPaying(true)} />} />
      <Section title="Summary"><DefList items={[["Type", label(inv.kind)], ["Total", formatMoney(inv.amount)], ["Paid", formatMoney(inv.paidAmount)], ["Outstanding", formatMoney(inv.status === "cancelled" ? 0 : inv.amount - inv.paidAmount)]]} /></Section>
      <Section title="What you're paying for">
        <DataTable<IInvoiceDetailResponse["items"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.items, page: 1, pageSize: 1000, total: inv.items.length } }}
          empty={<Empty title="No lines" />}
          columns={[{ key: "t", header: "Description", render: (i) => i.title }, { key: "k", header: "Type", render: (i) => label(i.kind) }, { key: "a", header: "Amount", align: "end", render: (i) => formatMoney(i.amount) }]}
        />
      </Section>
      <Section title="Payments">
        <DataTable<IInvoiceDetailResponse["payments"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: inv.payments, page: 1, pageSize: 1000, total: inv.payments.length } }}
          empty={<Empty title="No payments recorded yet" />}
          columns={[{ key: "d", header: "Paid on", render: (p) => formatDate(p.paidOn) }, { key: "m", header: "Method", render: (p) => label(p.method) }, { key: "a", header: "Amount", align: "end", render: (p) => formatMoney(p.amount) }, { key: "s", header: "Status", render: (p) => <StatusBadge status={p.status} /> }]}
        />
      </Section>
      <Modal open={paying} onClose={() => setPaying(false)} title="Report a payment">{paying && <ReportPaymentForm owed={owed} onDone={() => setPaying(false)} />}</Modal>
    </VStack>
  );
}

/** The landlord confirms the payment before it counts towards the invoice. */
function ReportPaymentForm({ owed, onDone }: { owed: number; onDone: () => void }) {
  const { invoiceId = "" } = useParams();
  const { apiPath } = useLease();
  const save = useSend<object>("POST", apiPath(`/invoices/${invoiceId}/payments`), [apiPath("/invoices")]);
  const form = useForm<{ amount: string; method: PaymentMethod; paidOn: string; reference: string }>({ defaultValues: { amount: String(owed), method: "bank_transfer", paidOn: todayIso(), reference: "" } });
  const submit = useSubmit(form, save, (v) => ({ amount: num(v.amount), method: v.method, paidOn: v.paidOn, reference: text(v.reference) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Send for confirmation" onCancel={onDone}>
      <FNumber control={form.control} name="amount" label="Amount (₫)" hint={`Outstanding: ${formatMoney(owed)}`} required width="100%" />
      <FSelect control={form.control} name="method" label="Method" options={[{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }]} width="100%" />
      <FDate control={form.control} name="paidOn" label="Paid on" required width="100%" />
      <FText control={form.control} name="reference" label="Reference" hint="Bank reference, receipt number… The landlord confirms it before it counts." width="100%" />
    </FormBody>
  );
}
