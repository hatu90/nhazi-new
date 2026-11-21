"use client";

import { useTranslations } from "next-intl";
import { todayIso } from "@/client/lib/format";
import { useEnumOptions } from "@/client/lib/use-enum";
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

export function PaymentFields({ x: { form } }: { x: ReturnType<typeof usePaymentForm> }) {
  const t = useTranslations("Invoices");
  const c = useTranslations("Common");
  const options = useEnumOptions();
  return (
    <VStack gap={4}>
      <FNumber control={form.control} name="amount" label={c("amount")} money required width="100%" />
      <FSelect control={form.control} name="method" label={t("method")} options={options("paymentMethod", ["cash", "bank_transfer"])} width="100%" />
      <FDate control={form.control} name="paidOn" label={t("paidOn")} required width="100%" />
      <FText control={form.control} name="reference" label={t("reference")} width="100%" />
    </VStack>
  );
}
