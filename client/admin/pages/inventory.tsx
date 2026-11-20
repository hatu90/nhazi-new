"use client";

import { useGet, useSend } from "@/client/lib/hooks";
import type { IItemListResponse, IItemResponse } from "@/client/lib/types";
import { DataTable, Empty, ErrorBox, Modal, TextField } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { ItemForm } from "./item-form";

/** The property's catalogue of things that can be handed over with a lease (bed, fridge, key…). */
export function InventoryPage() {
  const { apiPath, canManage } = useProperty();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<IItemResponse | "new" | null>(null);
  const query = useGet<IItemListResponse>(apiPath("/inventory-items"), { page, pageSize: 20, q }, { keepPrevious: true });
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/inventory-items/${b.id}`), [apiPath("/inventory-items")]);

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <div className="w-full sm:w-72"><TextField label="Search" type="search" placeholder="Search items…" value={q} onChange={(v) => { setQ(v); setPage(1); }} width="100%" /></div>
        {canManage && <Button label="Add item" onClick={() => setEditing("new")} />}
      </HStack>
      {remove.error && <ErrorBox error={remove.error} />}
      <DataTable<IItemResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No items" hint="List what you hand over with a lease: furniture, appliances, keys…" action={canManage && <Button label="Add the first item" onClick={() => setEditing("new")} />} />}
        columns={[
          { key: "name", header: "Name", render: (i) => i.name },
          {
            key: "actions",
            header: "",
            align: "end",
            render: (i) => canManage && (
              <HStack gap={1} justify="end">
                <Button label="Rename" size="sm" variant="ghost" onClick={() => setEditing(i)} />
                <Button label="Delete" size="sm" variant="ghost" clickAction={async () => { if (confirm(`Delete "${i.name}"?`)) await remove.mutateAsync({ id: i.id }); }} />
              </HStack>
            ),
          },
        ]}
      />
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add item" : "Rename item"}>
        {editing && <ItemForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </Stack>
  );
}
