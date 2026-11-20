"use client";

import { formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PaymentMethod } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { useLease } from "../lease-layout";

/** The landlord confirms the payment before it counts towards the invoice. */
export function ReportPaymentForm({ owed, onDone }: { owed: number; onDone: () => void }) {
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
