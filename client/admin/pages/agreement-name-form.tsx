"use client";

import { useTranslations } from "next-intl";
import { starterDocument } from "@/client/agreement/config";
import { useSend } from "@/client/lib/hooks";
import type { ITemplateSummaryResponse } from "@/client/lib/types";
import { FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

/** `template` = the template being renamed; undefined = creating one. `onDone` gets the new template's id when creating. */
export function useNameForm({ template, open, onDone }: { template?: ITemplateSummaryResponse; open: boolean; onDone: (createdId?: string) => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object, { id: string }>(template ? "PATCH" : "POST", template ? apiPath(`/agreement-templates/${template.id}`) : apiPath("/agreement-templates"), [apiPath("/agreement-templates")]);
  const form = useForm<{ name: string }>({ defaultValues: { name: template?.name ?? "" } });
  useOpenReset(open, () => { form.reset({ name: template?.name ?? "" }); save.reset(); }, template?.id);
  const submit = useSubmit(form, save, (v) => (template ? { name: v.name.trim() } : { name: v.name.trim(), data: starterDocument() }), (r) => onDone(template ? undefined : r.id));
  return { form, submit, error: save.error, busy: save.isPending };
}

export function NameFields({ x }: { x: ReturnType<typeof useNameForm> }) {
  const t = useTranslations("Common");
  return <FText control={x.form.control} name="name" label={t("name")} required width="100%" />;
}
