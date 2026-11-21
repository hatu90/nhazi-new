"use client";

import { useTranslations } from "next-intl";
import { todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { FDate, FNumber, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

const defaults = () => ({ readOn: todayIso(), time: new Date().toTimeString().slice(0, 5), value: "" });

/** Record a meter reading. In a modal pass `open`; inline on a page (the readings drawer) omit it: the form clears after each save. */
export function useReadingForm({ meterId, open, onDone }: { meterId: string; open?: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath(`/meters/${meterId}/readings`), [apiPath(`/meters/${meterId}/readings`)]);
  const form = useForm<{ readOn: string; time: string; value: string }>({ defaultValues: defaults() });
  useOpenReset(!!open, () => { form.reset(defaults()); save.reset(); });
  const submit = useSubmit(form, save, (v) => ({ readAt: new Date(`${v.readOn}T${v.time}:00`).toISOString(), value: Number(v.value) }), () => {
    if (open === undefined) form.reset(defaults());
    onDone();
  });
  return { form, submit, error: save.error, busy: save.isPending };
}

export function ReadingFields({ x: { form } }: { x: ReturnType<typeof useReadingForm> }) {
  const t = useTranslations("Meters");
  return (
    <VStack gap={4}>
      <FDate control={form.control} name="readOn" label={t("readOn")} required width="100%" />
      <FText control={form.control} name="time" label={t("time")} required rules={{ pattern: { value: /^([01]\d|2[0-3]):[0-5]\d$/, message: t("timeFormat") } }} width="100%" />
      <FNumber control={form.control} name="value" label={t("value")} required width="100%" />
    </VStack>
  );
}
