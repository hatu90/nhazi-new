"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateListResponse, ITemplateSummaryResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Tag, useConfirm, RowActions } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";
import { NameFields, useNameForm } from "./agreement-name-form";

export function AgreementsPage() {
  const confirm = useConfirm();
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"new" | null>(null);
  const nameForm = useNameForm({ open: dialog !== null, onDone: (id) => { setDialog(null); if (id) navigate(to(`agreements/${id}`)); } });
  const query = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { page, pageSize: 20 }, { keepPrevious: true });
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/agreement-templates/${b.id}`), [apiPath("/agreement-templates")]);
  const create = canManage && <Button icon={<Plus size={16} />} variant="primary" label="New template" onClick={() => setDialog("new")} />;

  return (
    <Stack gap={4}>
      <HStack justify="end">{create}</HStack>
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<ITemplateSummaryResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No agreement templates" hint="Design a lease agreement once, then attach it to leases." action={create} />}
        columns={[
          { key: "n", header: "Name", render: (t) => <Link href={to(`agreements/${t.id}`)}>{t.name}</Link> },
          { key: "d", header: "", render: (t) => (t.isDefault ? <Tag label="Default" tone="info" /> : null) },
          { key: "v", header: "Version", render: (t) => `v${t.currentVersion}` },
          { key: "u", header: "Updated", render: (t) => formatDate(t.updatedAt) },
          {
            key: "x",
            header: "",
            align: "end",
            render: (t) => canManage && (
              <RowActions actions={[
                { id: "edit", label: "Edit", icon: Pencil, onClick: () => navigate(to(`agreements/${t.id}`)) },
                { id: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: `Delete "${t.name}"?`, description: "Leases keep the version they were created with.", actionLabel: "Delete", onConfirm: () => remove.mutateAsync({ id: t.id }) }) },
              ]} />
            ),
          },
        ]}
      />
      <Modal open={dialog !== null} onClose={() => setDialog(null)}>
        <form noValidate onSubmit={nameForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"New template"} onOpenChange={(o) => { if (!o) setDialog(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><NameFields x={nameForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={nameForm.error} busy={nameForm.busy} submitLabel={"Create and edit"} onCancel={() => setDialog(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Stack>
  );
}
