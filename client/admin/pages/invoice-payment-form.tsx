"use client";

import { formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PaymentMethod } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

export function PaymentForm({ path, owed, onDone }: { path: string; owed: number; onDone: () => void }) {
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
