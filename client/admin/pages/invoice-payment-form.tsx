"use client";

import { formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PaymentMethod } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

interface Values {
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  reference: string;
}

export function usePaymentForm({ path, owed, open, onDone }: { path: string; owed: number; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", `${path}/payments`, [path, apiPath("/invoices"), apiPath("/stats")]);
  const defaults = (): Values => ({ amount: String(owed), method: "cash", paidOn: todayIso(), reference: "" });
  const form = useForm<Values>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); });
  const submit = useSubmit(form, save, (v) => ({ amount: num(v.amount), method: v.method, paidOn: v.paidOn, reference: text(v.reference) }), onDone);
  return { form, submit, error: save.error, busy: save.isPending, owed };
}

export function PaymentFields({ x: { form, owed } }: { x: ReturnType<typeof usePaymentForm> }) {
  return (
    <VStack gap={4}>
      <FNumber control={form.control} name="amount" label="Amount (₫)" hint={`Outstanding: ${formatMoney(owed)}`} required width="100%" />
      <FSelect control={form.control} name="method" label="Method" options={[{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }]} width="100%" />
      <FDate control={form.control} name="paidOn" label="Paid on" required width="100%" />
      <FText control={form.control} name="reference" label="Reference" hint="Bank reference, receipt number…" width="100%" />
    </VStack>
  );
}
