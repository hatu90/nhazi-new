"use client";

import { todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { FDate, FNumber, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

export function ReadingForm({ meterId, onDone }: { meterId: string; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath(`/meters/${meterId}/readings`), [apiPath(`/meters/${meterId}/readings`)]);
  const form = useForm<{ readOn: string; time: string; value: string }>({ defaultValues: { readOn: todayIso(), time: new Date().toTimeString().slice(0, 5), value: "" } });
  const submit = useSubmit(form, save, (v) => ({ readAt: new Date(`${v.readOn}T${v.time}:00`).toISOString(), value: Number(v.value) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Save reading" onCancel={onDone}>
      <FDate control={form.control} name="readOn" label="Read on" required width="100%" />
      <FText control={form.control} name="time" label="Time (HH:mm)" required placeholder="14:30" rules={{ pattern: { value: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Use HH:mm" } }} width="100%" />
      <FNumber control={form.control} name="value" label="Value" required width="100%" />
    </FormBody>
  );
}
