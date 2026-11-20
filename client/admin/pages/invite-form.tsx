"use client";

import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PropertyRole } from "@/client/lib/types";
import { FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";
import { roleOptions } from "./role-options";

export function InviteForm({ onDone }: { onDone: () => void }) {
  const { apiPath } = useProperty();
  const invite = useSend<object>("POST", apiPath("/invitations"), [apiPath("/invitations")]);
  const form = useForm<{ phone: string; role: PropertyRole }>({ defaultValues: { phone: "", role: "admin" } });
  const submit = useSubmit(form, invite, (v) => ({ phoneNumber: normalizePhone(v.phone), role: v.role }), onDone);
  return (
    <FormBody onSubmit={submit} error={invite.error} busy={invite.isPending} submitLabel="Send invitation" onCancel={onDone}>
      <FText control={form.control} name="phone" label="Phone number" type="tel" placeholder="0912 345 678" required rules={{ validate: (v) => isValidPhone(String(v)) || "Enter a valid phone number" }} width="100%" />
      <FSelect control={form.control} name="role" label="Role" options={roleOptions} width="100%" />
    </FormBody>
  );
}
