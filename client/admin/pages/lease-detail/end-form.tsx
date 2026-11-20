"use client";

import { Text } from "@astryxdesign/core/Text";
import { useForm } from "react-hook-form";
import { todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { text } from "@/client/ui/form";
import { FArea, FDate, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";

export function EndForm({ path, onDone }: { path: string; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", `${path}/close`, [apiPath("/leases"), apiPath("/invoices"), apiPath("/refunds"), apiPath("/billing-periods")]);
  const form = useForm<{ terminatedAt: string; reason: string }>({ defaultValues: { terminatedAt: todayIso(), reason: "" } });
  const submit = useSubmit(form, save, (v) => ({ terminatedAt: v.terminatedAt, reason: text(v.reason) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="End lease" onCancel={onDone}>
      <Text color="secondary">Ends the lease on this date: closes the running billing period, ends its services and issues the closing invoice and refund suggestion.</Text>
      <FDate control={form.control} name="terminatedAt" label="Last day" required width="100%" />
      <FArea control={form.control} name="reason" label="Reason" rows={2} width="100%" />
    </FormBody>
  );
}
