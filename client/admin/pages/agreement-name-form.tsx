"use client";

import { starterDocument } from "@/client/agreement/config";
import { useSend } from "@/client/lib/hooks";
import type { ITemplateSummaryResponse } from "@/client/lib/types";
import { FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

export function NameForm({ template, onDone }: { template?: ITemplateSummaryResponse; onDone: (createdId?: string) => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object, { id: string }>(template ? "PATCH" : "POST", template ? apiPath(`/agreement-templates/${template.id}`) : apiPath("/agreement-templates"), [apiPath("/agreement-templates")]);
  const form = useForm<{ name: string }>({ defaultValues: { name: template?.name ?? "" } });
  const submit = useSubmit(form, save, (v) => (template ? { name: v.name.trim() } : { name: v.name.trim(), data: starterDocument() }), (r) => onDone(template ? undefined : r.id));
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={template ? "Save" : "Create and edit"} onCancel={() => onDone()}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
    </FormBody>
  );
}
