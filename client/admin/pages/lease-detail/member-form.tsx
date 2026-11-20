"use client";

import { useForm } from "react-hook-form";
import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { num } from "@/client/ui/form";
import { FNumber, FText, FormBody, useSubmit } from "@/client/ui/rhf";

export function MemberForm({ path, onDone }: { path: string; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/members`, [path]);
  const form = useForm<{ name: string; yearOfBirth: string; phone: string }>({ defaultValues: { name: "", yearOfBirth: "", phone: "" } });
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim(), yearOfBirth: num(v.yearOfBirth), phoneNumber: v.phone.trim() ? normalizePhone(v.phone) : undefined }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add" onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FNumber control={form.control} name="yearOfBirth" label="Year of birth" required width="100%" />
      <FText control={form.control} name="phone" label="Phone number" hint="Optional. With a number, the person is invited to sign in and see this lease." type="tel" placeholder="0912 345 678" rules={{ validate: (v) => !String(v).trim() || isValidPhone(String(v)) || "Enter a valid phone number" }} width="100%" />
    </FormBody>
  );
}
