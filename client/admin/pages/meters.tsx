"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterListResponse, IMeterResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, Tag } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { BulkMetersFields, useBulkMetersForm } from "../bulk/bulk-meters-form";
import { useProperty } from "../property-layout";
import { MeterFields, useMeterForm } from "./meter-form";
import { MeterReadingsDrawer } from "./meter-readings-drawer";

export function MetersPage() {
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
      {canManage && <HStack justify="end" gap={2}><Button label="Bulk add" variant="secondary" onClick={() => setBulk(true)} /><Button label="Add meter" variant="primary" onClick={() => setCreating(true)} /></HStack>}
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<IMeterResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No meters" hint="Add a meter to a unit to record electricity or water readings." action={canManage && <Button variant="primary" label="Add a meter" onClick={() => setCreating(true)} />} />}
        columns={[
          { key: "name", header: "Meter", render: (m) => <HStack gap={2} align="center">{m.name}{m.removedAt && <Tag label="removed" />}</HStack> },
          { key: "unit", header: "Unit", render: (m) => m.unitName },
          { key: "service", header: "Service", render: (m) => m.serviceName },
          { key: "serial", header: "Serial", render: (m) => m.serialNumber ?? "—" },
          { key: "installed", header: "Installed", render: (m) => formatDate(m.installedAt) },
          { key: "go", header: "", align: "end", render: (m) => (
            <HStack gap={1} justify="end" align="center">
              <Button label="Readings" size="sm" variant="ghost" onClick={() => setViewing(m)} />
              {canManage && (
                <DropdownMenu
                  placement="below"
                  alignment="end"
                  items={[
                    { id: "edit", label: "Edit", onClick: () => setEditing(m) },
                    { id: "remove", label: "Remove", onClick: () => { if (confirm(`Remove meter "${m.name}"?`)) remove.mutate({ id: m.id }); } },
                  ]}
                  renderTrigger={(props) => <button type="button" {...props} aria-label="More actions" className="cursor-pointer rounded px-2 py-1 text-lg leading-none">⋯</button>}
                />
              )}
            </HStack>
          ) },
        ]}
      />
      <Modal open={bulk} onClose={() => setBulk(false)}>
        <form noValidate onSubmit={bulkForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Bulk add meters"} onOpenChange={(o) => { if (!o) setBulk(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><BulkMetersFields x={bulkForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={bulkForm.error} busy={bulkForm.busy} submitLabel={"Create meters"} onCancel={() => setBulk(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={createForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add meter"} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MeterFields x={createForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={createForm.error} busy={createForm.busy} submitLabel={"Add meter"} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={editForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Edit meter"} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MeterFields x={editForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={editForm.error} busy={editForm.busy} submitLabel={"Save"} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <MeterReadingsDrawer meter={viewing} onClose={() => setViewing(null)} />
    </Stack>
  );
}

