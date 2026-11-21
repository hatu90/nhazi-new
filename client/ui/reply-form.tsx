"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useSend } from "@/client/lib/hooks";
import { FArea, useOpenReset, useSubmit } from "./rhf";

/** Add a comment to a request thread (admin and tenant share it). `path` is the request's API path. */
export function useReplyForm({ path, invalidate, open, onDone }: { path: string; invalidate: string[]; open: boolean; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/comments`, invalidate);
  const form = useForm<{ body: string }>({ defaultValues: { body: "" } });
  useOpenReset(open, () => { form.reset({ body: "" }); save.reset(); });
  const submit = useSubmit(form, save, (v) => ({ body: v.body.trim() }), onDone);
  return { form, submit, error: save.error, busy: save.isPending };
}

export function ReplyFields({ x }: { x: ReturnType<typeof useReplyForm> }) {
  const t = useTranslations("Requests");
  return <FArea control={x.form.control} name="body" label={t("reply")} rows={4} required width="100%" />;
}
