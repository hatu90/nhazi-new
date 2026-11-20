"use client";

import { useForm } from "react-hook-form";
import { formatDate } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { num } from "@/client/ui/form";
import { FDate, FNumber, FormBody, useSubmit } from "@/client/ui/rhf";

export function RentForm({ path, last, onDone }: { path: string; last?: string; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/rent`, [path]);
  const form = useForm<{ effectiveDate: string; amount: string }>({ defaultValues: { effectiveDate: "", amount: "" } });
  const submit = useSubmit(form, save, (v) => ({ effectiveDate: v.effectiveDate, amount: num(v.amount) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add" onCancel={onDone}>
      <FDate control={form.control} name="effectiveDate" label="Effective from" hint={last ? `Must be after ${formatDate(last)}.` : undefined} min={last} required width="100%" />
      <FNumber control={form.control} name="amount" label="Monthly rent (₫)" required width="100%" />
    </FormBody>
  );
}
