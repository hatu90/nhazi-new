"use client";

import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PropertyRole } from "@/client/lib/types";
import { FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";
import { roleOptions } from "./role-options";

const defaults: { phone: string; role: PropertyRole } = { phone: "", role: "admin" };

export function useInviteForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const invite = useSend<object>("POST", apiPath("/invitations"), [apiPath("/invitations")]);
  const form = useForm<typeof defaults>({ defaultValues: defaults });
  useOpenReset(open, () => { form.reset(defaults); invite.reset(); });
  const submit = useSubmit(form, invite, (v) => ({ phoneNumber: normalizePhone(v.phone), role: v.role }), onDone);
  return { form, submit, error: invite.error, busy: invite.isPending };
}

export function InviteFields({ x: { form } }: { x: ReturnType<typeof useInviteForm> }) {
  return (
    <VStack gap={4}>
      <FText control={form.control} name="phone" label="Phone number" type="tel" placeholder="0912 345 678" required rules={{ validate: (v) => isValidPhone(String(v)) || "Enter a valid phone number" }} width="100%" />
      <FSelect control={form.control} name="role" label="Role" options={roleOptions} width="100%" />
    </VStack>
  );
}
