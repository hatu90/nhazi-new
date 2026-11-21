"use client";

import { useTranslations } from "next-intl";
import { useEnumOptions } from "@/client/lib/use-enum";
import { useSend } from "@/client/lib/hooks";
import { text } from "@/client/ui/form";
import { FArea, FDate, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { useLease } from "../lease-layout";
import type { RequestPriority, RequestType } from "@/client/lib/types";

interface Values {
  type: RequestType;
  title: string;
  description: string;
  priority: RequestPriority;
  requestedCloseDate: string;
}

const types: RequestType[] = ["maintenance", "close_lease", "enquiry"];

const priorities: RequestPriority[] = ["low", "normal", "high", "urgent"];
const defaults: Values = { type: "maintenance", title: "", description: "", priority: "normal", requestedCloseDate: "" };

export function useRequestForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { apiPath, to } = useLease();
  const navigate = useNavigate();
  const save = useSend<object, { id: string }>("POST", apiPath("/requests"), [apiPath("/requests")]);
  const form = useForm<Values>({ defaultValues: defaults });
  useOpenReset(open, () => { form.reset(defaults); save.reset(); });
  const type = useWatch({ control: form.control, name: "type" });
  const submit = useSubmit(
    form,
    save,
    (v) => ({ type: v.type, title: v.title.trim(), description: text(v.description), priority: v.priority, requestedCloseDate: v.type === "close_lease" ? v.requestedCloseDate : undefined }),
    (r) => { onDone(); navigate(to(`requests/${r.id}`)); },
  );
  return { form, submit, error: save.error, busy: save.isPending, type };
}

export function RequestFields({ x: { form, type } }: { x: ReturnType<typeof useRequestForm> }) {
  const t = useTranslations("Requests");
  const d = useTranslations("Dashboard");
  const c = useTranslations("Common");
  const options = useEnumOptions();
  return (
    <VStack gap={4}>
      <FSelect control={form.control} name="type" label={c("type")} options={options("requestType", types)} width="100%" />
      <FText control={form.control} name="title" label={t("title")} required width="100%" />
      <FArea control={form.control} name="description" label={d("requestDetails")} width="100%" />
      <FSelect control={form.control} name="priority" label={t("priority")} options={options("priority", priorities)} width="100%" />
      {type === "close_lease" && <FDate control={form.control} name="requestedCloseDate" label={d("moveOut")} required width="100%" />}
    </VStack>
  );
}
