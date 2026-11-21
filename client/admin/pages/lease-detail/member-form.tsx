"use client";

import { useTranslations } from "next-intl";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { num } from "@/client/ui/form";
import { FNumber, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";

const defaults = { name: "", yearOfBirth: "", phone: "" };

export function useMemberForm({ path, open, onDone }: { path: string; open: boolean; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/members`, [path]);
  const form = useForm<typeof defaults>({ defaultValues: defaults });
  useOpenReset(open, () => { form.reset(defaults); save.reset(); });
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim(), yearOfBirth: num(v.yearOfBirth), phoneNumber: v.phone.trim() ? normalizePhone(v.phone) : undefined }), onDone);
  return { form, submit, error: save.error, busy: save.isPending };
}

export function MemberFields({ x: { form } }: { x: ReturnType<typeof useMemberForm> }) {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  return (
    <VStack gap={4}>
      <FText control={form.control} name="name" label={c("name")} required width="100%" />
      <FNumber control={form.control} name="yearOfBirth" label={t("yearOfBirth")} required width="100%" />
      <FText control={form.control} name="phone" label={c("phone")} type="tel" placeholder="0912 345 678" rules={{ validate: (v) => !String(v).trim() || isValidPhone(String(v)) || c("invalidPhone") }} width="100%" />
    </VStack>
  );
}
