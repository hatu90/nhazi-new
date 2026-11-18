"use client";

import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { starterDocument } from "@/client/agreement/config";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateListResponse, ITemplateSummaryResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Tag } from "@/client/ui";
import { FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

export function AgreementsPage() {
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<ITemplateSummaryResponse | "new" | null>(null);
  const query = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { page, pageSize: 20 }, { keepPrevious: true });
  const makeDefault = useSend<{ id: string; isDefault: true }>("PATCH", (b) => apiPath(`/agreement-templates/${b.id}`), [apiPath("/agreement-templates")]);
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/agreement-templates/${b.id}`), [apiPath("/agreement-templates")]);
  const create = canManage && <Button label="New template" onClick={() => setDialog("new")} />;

  return (
    <Stack gap={4}>
      <HStack justify="end">{create}</HStack>
      {(makeDefault.error || remove.error) && <ErrorBox error={makeDefault.error ?? remove.error} />}
      <DataTable<ITemplateSummaryResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No agreement templates" hint="Design a lease agreement once, then attach it to leases. Placeholders such as {{tenantNames}} are filled per lease." action={create} />}
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
              <HStack gap={2} justify="end">
                {!t.isDefault && <Button label="Make default" size="sm" variant="ghost" isLoading={makeDefault.isPending} clickAction={async () => { await makeDefault.mutateAsync({ id: t.id, isDefault: true }); }} />}
                <Button label="Rename" size="sm" variant="ghost" onClick={() => setDialog(t)} />
                <Button label="Delete" size="sm" variant="ghost" isLoading={remove.isPending} clickAction={async () => { if (confirm(`Delete "${t.name}"? Leases keep the version they were created with.`)) await remove.mutateAsync({ id: t.id }); }} />
              </HStack>
            ),
          },
        ]}
      />
      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === "new" ? "New template" : "Rename template"}>
        {dialog && <NameForm key={dialog === "new" ? "new" : dialog.id} template={dialog === "new" ? undefined : dialog} onDone={(id) => { setDialog(null); if (id) navigate(to(`agreements/${id}`)); }} />}
      </Modal>
    </Stack>
  );
}

function NameForm({ template, onDone }: { template?: ITemplateSummaryResponse; onDone: (createdId?: string) => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object, { id: string }>(template ? "PATCH" : "POST", template ? apiPath(`/agreement-templates/${template.id}`) : apiPath("/agreement-templates"), [apiPath("/agreement-templates")]);
  const form = useForm<{ name: string }>({ defaultValues: { name: template?.name ?? "" } });
  const submit = useSubmit(form, save, (v) => (template ? { name: v.name.trim() } : { name: v.name.trim(), data: starterDocument() }), (r) => onDone(template ? undefined : r.id));
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={template ? "Save" : "Create and edit"} onCancel={() => onDone()}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
    </FormBody>
  );
}
