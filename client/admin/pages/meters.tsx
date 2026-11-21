"use client";

import { useTranslations } from "next-intl";
import { Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterListResponse, IMeterResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Tag, useConfirm, RowActions } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { BulkMetersFields, useBulkMetersForm } from "../bulk/bulk-meters-form";
import { useProperty } from "../property-layout";
import { MeterFields, useMeterForm } from "./meter-form";
import { MeterReadingsDrawer } from "./meter-readings-drawer";

export function MetersPage() {
  const t = useTranslations("Meters");
  const c = useTranslations("Common");
  const confirm = useConfirm();
  const { apiPath, canManage } = useProperty();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [viewing, setViewing] = useState<IMeterResponse | null>(null);
  const [editing, setEditing] = useState<IMeterResponse | null>(null);
  const editForm = useMeterForm({ meter: editing ?? undefined, open: !!editing, onDone: () => setEditing(null) });
  const createForm = useMeterForm({ open: creating, onDone: () => setCreating(false) });
  const bulkForm = useBulkMetersForm({ open: bulk, onDone: () => setBulk(false) });
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/meters/${b.id}`), [apiPath("/meters")]);
  const query = useGet<IMeterListResponse>(apiPath("/meters"), { page, pageSize: 20 }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end" gap={2}><Button icon={<Plus size={16} />} label={t("bulkAdd")} variant="secondary" onClick={() => setBulk(true)} /><Button label={t("addMeter")} variant="primary" onClick={() => setCreating(true)} /></HStack>}
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<IMeterResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} action={canManage && <Button icon={<Plus size={16} />} variant="primary" label={t("addMeter")} onClick={() => setCreating(true)} />} />}
        columns={[
          { key: "name", header: t("meter"), render: (m) => <HStack gap={2} align="center">{m.name}{m.removedAt && <Tag label={t("removed")} />}</HStack> },
          { key: "unit", header: c("unit"), render: (m) => m.unitName },
          { key: "service", header: t("service"), render: (m) => m.serviceName },
          { key: "serial", header: t("serial"), render: (m) => m.serialNumber ?? "—" },
          { key: "installed", header: t("installed"), render: (m) => formatDate(m.installedAt) },
          { key: "go", header: "", align: "end", render: (m) => (
            <RowActions actions={[
                { id: "readings", label: t("readingsAction"), icon: Gauge, onClick: () => setViewing(m) },
                canManage && { id: "edit", label: c("edit"), icon: Pencil, onClick: () => setEditing(m) },
                canManage && { id: "remove", label: c("remove"), icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: t("removeTitle", { name: m.name }), description: t("removeBody"), actionLabel: c("remove"), onConfirm: () => remove.mutateAsync({ id: m.id }) }) },
              ]} />
          ) },
        ]}
      />
      <Modal open={bulk} onClose={() => setBulk(false)}>
        <form noValidate onSubmit={bulkForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("bulkTitle")} onOpenChange={(o) => { if (!o) setBulk(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><BulkMetersFields x={bulkForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={bulkForm.error} busy={bulkForm.busy} submitLabel={t("createMeters")} onCancel={() => setBulk(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={createForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addMeter")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MeterFields x={createForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={createForm.error} busy={createForm.busy} submitLabel={t("addMeter")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={editForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("editMeter")} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MeterFields x={editForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={editForm.error} busy={editForm.busy} submitLabel={c("save")} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <MeterReadingsDrawer meter={viewing} onClose={() => setViewing(null)} />
      {confirm.element}
    </Stack>
  );
}

