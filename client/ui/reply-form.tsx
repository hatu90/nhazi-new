"use client";

import { useForm } from "react-hook-form";
import { useSend } from "@/client/lib/hooks";
import { FArea, FormBody, useSubmit } from "./rhf";

/** Add a comment to a request thread (admin and tenant share it). `path` is the request's API path. */
export function ReplyForm({ path, invalidate, onDone }: { path: string; invalidate: string[]; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/comments`, invalidate);
  const form = useForm<{ body: string }>({ defaultValues: { body: "" } });
  const submit = useSubmit(form, save, (v) => ({ body: v.body.trim() }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Send reply" onCancel={onDone}>
      <FArea control={form.control} name="body" label="Reply" rows={4} required width="100%" />
    </FormBody>
  );
}
