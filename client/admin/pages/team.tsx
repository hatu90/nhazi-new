"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMe } from "@/client/auth/auth-provider";
import { formatDate, isValidPhone, label, normalizePhone } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvitationResponse, IMemberResponse, IPaginated, PropertyRole } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, PageSpinner, SelectField, StatusBadge } from "@/client/ui";
import { FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

const roles: PropertyRole[] = ["owner", "admin", "technician", "viewer"];
const roleOptions = roles.map((r) => ({ value: r, label: label(r) }));

export function TeamPage() {
  const { apiPath, isOwner } = useProperty();
  const me = useMe();
  const members = useGet<IMemberResponse[]>(apiPath("/members"));
  const invitations = useGet<IPaginated<IInvitationResponse>>(apiPath("/invitations"), { kind: "property", pageSize: 50 }, { enabled: isOwner });
  const changeRole = useSend<{ accountId: string; role: PropertyRole }>("PATCH", (b) => apiPath(`/members/${b.accountId}`), [apiPath("/members")]);
  const remove = useSend<string>("DELETE", (id) => apiPath(`/members/${id}`), [apiPath("/members")]);
  const revoke = useSend<string>("POST", (id) => apiPath(`/invitations/${id}/revoke`), [apiPath("/invitations")]);
  const [inviting, setInviting] = useState(false);

  return (
    <VStack gap={4}>
      <HStack justify="between" align="center" gap={3} wrap="wrap">
        <VStack gap={0.5}>
          <Heading level={2}>Team</Heading>
          <Text size="sm" color="secondary">People who can manage this property. A new member signs in with their phone number.</Text>
        </VStack>
        {isOwner && <Button label="Add team member" onClick={() => setInviting(true)} />}
      </HStack>
      {members.isPending ? <PageSpinner /> : members.error ? <ErrorBox error={members.error} /> : (
        members.data.length === 0 ? <Empty title="No members" /> : (
            <DataTable<IMemberResponse & { id: string }>
              query={{ isPending: false, error: null, refetch: () => {}, data: { items: members.data.map((m) => ({ ...m, id: m.accountId })), page: 1, pageSize: 1000, total: members.data.length } }}
              empty={null}
              columns={[
                { key: "name", header: "Name", render: (m) => <>{m.displayName}{m.accountId === me.id && <Text color="secondary" size="sm"> (you)</Text>}</> },
                { key: "phone", header: "Phone", render: (m) => m.phoneNumber },
                {
                  key: "role", header: "Role",
                  render: (m) => isOwner && m.accountId !== me.id
                    ? <SelectField label={`Role of ${m.displayName}`} value={m.role} onChange={(v) => changeRole.mutate({ accountId: m.accountId, role: v as PropertyRole })} options={roleOptions} width={160} />
                    : label(m.role),
                },
                { key: "rm", header: "", align: "end", render: (m) => isOwner && m.accountId !== me.id && <Button label="Remove" size="sm" variant="ghost" onClick={() => confirm(`Remove ${m.displayName} from this property?`) && remove.mutate(m.accountId)} /> },
              ]}
            />
          )
      )}
      {(changeRole.error || remove.error) && <ErrorBox error={changeRole.error ?? remove.error} />}

      {isOwner ? (
        invitations.data && invitations.data.items.length > 0 && (
          <VStack gap={2}>
            <Heading level={3}>Invitations</Heading>
            <DataTable<IInvitationResponse>
              query={{ isPending: false, error: null, refetch: () => {}, data: invitations.data }}
              empty={null}
              columns={[
                { key: "phone", header: "Phone", render: (i) => i.phoneNumber },
                { key: "role", header: "Role", render: (i) => (i.role ? label(i.role) : "—") },
                { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
                { key: "sent", header: "Sent", render: (i) => formatDate(i.createdAt) },
                { key: "rv", header: "", align: "end", render: (i) => i.status === "pending" && <Button label="Revoke" size="sm" variant="ghost" onClick={() => revoke.mutate(i.id)} /> },
              ]}
            />
          </VStack>
        )
      ) : <Text color="secondary">Only owners can invite people or change roles.</Text>}
      <Modal open={inviting} onClose={() => setInviting(false)} title="Add team member">{inviting && <InviteForm onDone={() => setInviting(false)} />}</Modal>
    </VStack>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
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
