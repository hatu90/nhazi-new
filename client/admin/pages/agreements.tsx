"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateListResponse, ITemplateSummaryResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Tag, useConfirm, RowActions } from "@/client/ui";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";
import { NameFields, useNameForm } from "./agreement-name-form";

export function AgreementsPage() {
  const t = useTranslations("Agreements");
  const c = useTranslations("Common");
  const confirm = useConfirm();
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"new" | null>(null);
  const nameForm = useNameForm({ open: dialog !== null, onDone: (id) => { setDialog(null); if (id) navigate(to(`agreements/${id}`)); } });
  const query = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { page, pageSize: 20 }, { keepPrevious: true });
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/agreement-templates/${b.id}`), [apiPath("/agreement-templates")]);
  const create = canManage && <Button icon={<Plus size={16} />} variant="primary" label={t("newTemplate")} onClick={() => setDialog("new")} />;

  return (
    <Stack gap={4}>
      <HStack justify="end">{create}</HStack>
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<ITemplateSummaryResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} action={create} />}
        columns={[
          { key: "n", header: c("name"), render: (row) => <Link href={to(`agreements/${row.id}`)}>{row.name}</Link> },
          { key: "d", header: "", render: (row) => (row.isDefault ? <Tag label={t("default")} tone="info" /> : null) },
          { key: "v", header: t("version"), render: (row) => `v${row.currentVersion}` },
          { key: "u", header: t("updated"), render: (row) => formatDate(row.updatedAt) },
          {
            key: "x",
            header: "",
            align: "end",
            render: (row) => canManage && (
              <RowActions actions={[
                { id: "edit", label: c("edit"), icon: Pencil, onClick: () => navigate(to(`agreements/${row.id}`)) },
                { id: "delete", label: c("delete"), icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: t("deleteTitle", { name: row.name }), description: t("deleteBody"), actionLabel: c("delete"), onConfirm: () => remove.mutateAsync({ id: row.id }) }) },
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
            header={<DialogHeader title={t("newTemplate")} onOpenChange={(o) => { if (!o) setDialog(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><NameFields x={nameForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={nameForm.error} busy={nameForm.busy} submitLabel={t("createAndEdit")} onCancel={() => setDialog(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Stack>
  );
}
