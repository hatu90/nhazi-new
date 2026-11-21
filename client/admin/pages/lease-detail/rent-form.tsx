"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { formatDate } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { num } from "@/client/ui/form";
import { FDate, FNumber, useOpenReset, useSubmit } from "@/client/ui/rhf";

const defaults = { effectiveDate: "", amount: "" };

/** `last` = the effective date of the latest rent version; the new one must be after it. */
export function useRentForm({ path, last, open, onDone }: { path: string; last?: string; open: boolean; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/rent`, [path]);
  const form = useForm<typeof defaults>({ defaultValues: defaults });
  useOpenReset(open, () => { form.reset(defaults); save.reset(); });
  const submit = useSubmit(form, save, (v) => ({ effectiveDate: v.effectiveDate, amount: num(v.amount) }), onDone);
  return { form, submit, error: save.error, busy: save.isPending, last };
}

export function RentFields({ x: { form, last } }: { x: ReturnType<typeof useRentForm> }) {
  return (
    <VStack gap={4}>
      <FDate control={form.control} name="effectiveDate" label="Effective from" hint={last ? `Must be after ${formatDate(last)}.` : undefined} min={last} required width="100%" />
      <FNumber control={form.control} name="amount" label="Monthly rent (₫)" required width="100%" />
    </VStack>
  );
}
