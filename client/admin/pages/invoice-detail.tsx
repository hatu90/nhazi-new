"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IAdminInvoiceDetailResponse, PaymentMethod } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSpinner, Section, StatusBadge } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const path = apiPath(`/invoices/${invoiceId}`);
  const invoice = useGet<IAdminInvoiceDetailResponse>(path);
  const cancel = useSend<undefined>("POST", `${path}/cancel`, [apiPath("/invoices")]);
  const [paying, setPaying] = useState(false);
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
            <Button label="Record payment" onClick={() => setPaying(true)} />
            <Button label="Cancel invoice" variant="secondary" isLoading={cancel.isPending} clickAction={async () => { if (confirm("Cancel this invoice?")) await cancel.mutateAsync(undefined); }} />
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
                  <Button label="Confirm" size="sm" isLoading={review.isPending} clickAction={async () => { await review.mutateAsync({ id: p.id, decision: "confirm" }); }} />
                </HStack>
              ),
            },
          ]}
        />
        {review.error && <ErrorBox error={review.error} />}
      </Section>
      <Modal open={paying} onClose={() => setPaying(false)} title="Record payment">{paying && <PaymentForm path={path} owed={owed} onDone={() => setPaying(false)} />}</Modal>
    </VStack>
  );
}

function PaymentForm({ path, owed, onDone }: { path: string; owed: number; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", `${path}/payments`, [path, apiPath("/invoices"), apiPath("/stats")]);
  const form = useForm<{ amount: string; method: PaymentMethod; paidOn: string; reference: string }>({ defaultValues: { amount: String(owed), method: "cash", paidOn: todayIso(), reference: "" } });
  const submit = useSubmit(form, save, (v) => ({ amount: num(v.amount), method: v.method, paidOn: v.paidOn, reference: text(v.reference) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Record payment" onCancel={onDone}>
      <FNumber control={form.control} name="amount" label="Amount (₫)" hint={`Outstanding: ${formatMoney(owed)}`} required width="100%" />
      <FSelect control={form.control} name="method" label="Method" options={[{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }]} width="100%" />
      <FDate control={form.control} name="paidOn" label="Paid on" required width="100%" />
      <FText control={form.control} name="reference" label="Reference" hint="Bank reference, receipt number…" width="100%" />
    </FormBody>
  );
}
