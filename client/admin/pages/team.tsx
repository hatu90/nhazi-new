"use client";

import { MailX, Plus, UserMinus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { useMe } from "@/client/auth/auth-provider";
import { formatDate, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvitationResponse, IMemberResponse, IPaginated, PropertyRole } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, PageSpinner, Section, SelectField, StatusBadge, useConfirm, RowActions } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { InviteFields, useInviteForm } from "./invite-form";
import { roleOptions } from "./role-options";

export function TeamPage() {
  const confirm = useConfirm();
  const { apiPath, isOwner } = useProperty();
  const me = useMe();
  const members = useGet<IMemberResponse[]>(apiPath("/members"));
  const invitations = useGet<IPaginated<IInvitationResponse>>(apiPath("/invitations"), { kind: "property", pageSize: 50 }, { enabled: isOwner });
  const changeRole = useSend<{ accountId: string; role: PropertyRole }>("PATCH", (b) => apiPath(`/members/${b.accountId}`), [apiPath("/members")]);
  const remove = useSend<string>("DELETE", (id) => apiPath(`/members/${id}`), [apiPath("/members")]);
  const revoke = useSend<string>("POST", (id) => apiPath(`/invitations/${id}/revoke`), [apiPath("/invitations")]);
  const [inviting, setInviting] = useState(false);
  const inviteForm = useInviteForm({ open: inviting, onDone: () => setInviting(false) });

  return (
    <Section title="Team" action={isOwner && <Button icon={<Plus size={16} />} variant="primary" label="Add team member" onClick={() => setInviting(true)} />}>
      <Text size="sm" color="secondary">People who can manage this property. A new member signs in with their phone number.</Text>
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
                { key: "rm", header: "", align: "end", render: (m) => isOwner && m.accountId !== me.id && <RowActions actions={[{ id: "remove", label: "Remove", icon: UserMinus, destructive: true, onClick: () => confirm.ask({ title: `Remove ${m.displayName}?`, description: "They lose access to this property.", actionLabel: "Remove", onConfirm: () => remove.mutateAsync(m.accountId) }) }]} /> },
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
                { key: "rv", header: "", align: "end", render: (i) => i.status === "pending" && <RowActions actions={[{ id: "revoke", label: "Revoke invite", icon: MailX, destructive: true, onClick: () => revoke.mutate(i.id) }]} /> },
              ]}
            />
          </VStack>
        )
      ) : <Text color="secondary">Only owners can invite people or change roles.</Text>}
      <Modal open={inviting} onClose={() => setInviting(false)}>
        <form noValidate onSubmit={inviteForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add team member"} onOpenChange={(o) => { if (!o) setInviting(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><InviteFields x={inviteForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={inviteForm.error} busy={inviteForm.busy} submitLabel={"Send invitation"} onCancel={() => setInviting(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Section>
  );
}
