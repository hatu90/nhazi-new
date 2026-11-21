"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IItemListResponse, IItemResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, TextField, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { ItemFields, useItemForm } from "./item-form";

/** The property's catalogue of things that can be handed over with a lease (bed, fridge, key…). */
export function InventoryPage() {
  const confirm = useConfirm();
  const { apiPath, canManage } = useProperty();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<IItemResponse | "new" | null>(null);
  const itemForm = useItemForm({ item: editing === null || editing === "new" ? undefined : editing, open: editing !== null, onDone: () => setEditing(null) });
  const query = useGet<IItemListResponse>(apiPath("/inventory-items"), { page, pageSize: 20, q }, { keepPrevious: true });
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/inventory-items/${b.id}`), [apiPath("/inventory-items")]);

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <div className="w-full sm:w-72"><TextField label="Search" type="search" placeholder="Search items…" value={q} onChange={(v) => { setQ(v); setPage(1); }} width="100%" /></div>
        {canManage && <Button variant="primary" label="Add item" onClick={() => setEditing("new")} />}
      </HStack>
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<IItemResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No items" hint="List what you hand over with a lease: furniture, appliances, keys…" action={canManage && <Button variant="primary" label="Add the first item" onClick={() => setEditing("new")} />} />}
        columns={[
          { key: "name", header: "Name", render: (i) => i.name },
          {
            key: "actions",
            header: "",
            align: "end",
            render: (i) => canManage && (
              <HStack gap={1} justify="end">
                <Button label="Rename" size="sm" variant="ghost" onClick={() => setEditing(i)} />
                <Button label="Delete" size="sm" variant="ghost" onClick={() => confirm.ask({ title: `Delete "${i.name}"?`, description: "This item is removed from the property inventory.", actionLabel: "Delete", onConfirm: () => remove.mutateAsync({ id: i.id }) })} />
              </HStack>
            ),
          },
        ]}
      />
      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={itemForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={editing === "new" ? "Add item" : "Rename item"} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ItemFields x={itemForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={itemForm.error} busy={itemForm.busy} submitLabel={editing === "new" ? "Add item" : "Save"} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Stack>
  );
}
