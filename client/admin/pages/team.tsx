"use client";

import { useTranslations } from "next-intl";
import { MailX, Plus, UserMinus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { useMe } from "@/client/auth/auth-provider";
import { formatDate } from "@/client/lib/format";
import { useEnum, useEnumOptions } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IInvitationResponse, IMemberResponse, IPaginated, PropertyRole } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, ListSkeleton, Modal, RowActions, Section, SelectField, StatusBadge, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { InviteFields, useInviteForm } from "./invite-form";

const roles: PropertyRole[] = ["owner", "admin", "technician", "viewer"];

export function TeamPage() {
  const t = useTranslations("Team");
  const c = useTranslations("Common");
  const en = useEnum();
  const roleOptions = useEnumOptions()("role", roles);
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
    <Section title={t("title")} action={isOwner && <Button icon={<Plus size={16} />} variant="primary" label={t("add")} onClick={() => setInviting(true)} />}>
      {members.isPending ? <ListSkeleton /> : members.error ? <ErrorBox error={members.error} /> : (
        members.data.length === 0 ? <Empty title={t("empty")} /> : (
            <DataTable<IMemberResponse & { id: string }>
              query={{ isPending: false, error: null, refetch: () => {}, data: { items: members.data.map((m) => ({ ...m, id: m.accountId })), page: 1, pageSize: 1000, total: members.data.length } }}
              empty={null}
              columns={[
                { key: "name", header: c("name"), render: (m) => <>{m.displayName}{m.accountId === me.id && <Text color="secondary" size="sm"> {t("you")}</Text>}</> },
                { key: "phone", header: c("phone"), render: (m) => m.phoneNumber },
                {
                  key: "role", header: c("role"),
                  render: (m) => isOwner && m.accountId !== me.id
                    ? <SelectField label={t("roleOf", { name: m.displayName })} value={m.role} onChange={(v) => changeRole.mutate({ accountId: m.accountId, role: v as PropertyRole })} options={roleOptions} width={160} />
                    : en("role", m.role),
                },
                { key: "rm", header: "", align: "end", render: (m) => isOwner && m.accountId !== me.id && <RowActions actions={[{ id: "remove", label: c("remove"), icon: UserMinus, destructive: true, onClick: () => confirm.ask({ title: t("removeTitle", { name: m.displayName }), description: t("removeBody"), actionLabel: c("remove"), onConfirm: () => remove.mutateAsync(m.accountId) }) }]} /> },
              ]}
            />
          )
      )}
      {(changeRole.error || remove.error) && <ErrorBox error={changeRole.error ?? remove.error} />}

      {isOwner ? (
        invitations.data && invitations.data.items.length > 0 && (
          <VStack gap={2}>
            <Heading level={3}>{t("invitations")}</Heading>
            <DataTable<IInvitationResponse>
              query={{ isPending: false, error: null, refetch: () => {}, data: invitations.data }}
              empty={null}
              columns={[
                { key: "phone", header: c("phone"), render: (i) => i.phoneNumber },
                { key: "role", header: c("role"), render: (i) => (i.role ? en("role", i.role) : "—") },
                { key: "status", header: c("status"), render: (i) => <StatusBadge status={i.status} /> },
                { key: "sent", header: t("sent"), render: (i) => formatDate(i.createdAt) },
                { key: "rv", header: "", align: "end", render: (i) => i.status === "pending" && <RowActions actions={[{ id: "revoke", label: t("revoke"), icon: MailX, destructive: true, onClick: () => revoke.mutate(i.id) }]} /> },
              ]}
            />
          </VStack>
        )
      ) : <Text color="secondary">{t("ownersOnly")}</Text>}
      <Modal open={inviting} onClose={() => setInviting(false)}>
        <form noValidate onSubmit={inviteForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("add")} onOpenChange={(o) => { if (!o) setInviting(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><InviteFields x={inviteForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={inviteForm.error} busy={inviteForm.busy} submitLabel={t("send")} onCancel={() => setInviting(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Section>
  );
}
