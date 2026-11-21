"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IUnitListResponse, IUnitResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, TextField } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { BulkUnitsFields, useBulkUnitsForm } from "../bulk/bulk-units-form";
import { useProperty } from "../property-layout";
import { UnitFields, useUnitForm } from "./unit-form";

export function UnitsPage() {
  const { apiPath, canManage } = useProperty();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<IUnitResponse | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const unitForm = useUnitForm({ unit: editing === null || editing === "new" ? undefined : editing, open: editing !== null, onDone: () => setEditing(null) });
  const bulkForm = useBulkUnitsForm({ open: bulk, onDone: () => setBulk(false) });
  const query = useGet<IUnitListResponse>(apiPath("/units"), { page, pageSize: 20, q }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <div className="w-full sm:w-72"><TextField label="Search" type="search" placeholder="Search units…" value={q} onChange={(v) => { setQ(v); setPage(1); }} width="100%" /></div>
        {canManage && <HStack gap={2}><Button label="Bulk add" variant="secondary" onClick={() => setBulk(true)} /><Button label="Add unit" variant="primary" onClick={() => setEditing("new")} /></HStack>}
      </HStack>
      <DataTable<IUnitResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No units" hint="Units are the rooms or apartments you rent out." action={canManage && <Button variant="primary" label="Add the first unit" onClick={() => setEditing("new")} />} />}
        columns={[
          { key: "name", header: "Name", render: (u) => u.name },
          { key: "floor", header: "Floor", render: (u) => u.floor },
          { key: "area", header: "Area", render: (u) => `${u.area} m²` },
          { key: "rooms", header: "Beds / baths", render: (u) => `${u.bedrooms ?? "—"} / ${u.bathrooms ?? "—"}` },
          { key: "rent", header: "Rent", render: (u) => (u.rentNegotiable ? "Negotiable" : formatMoney(u.rentPrice)) },
          { key: "edit", header: "", align: "end", render: (u) => canManage && <Button label="Edit" size="sm" variant="ghost" onClick={() => setEditing(u)} /> },
        ]}
      />
      <Modal open={bulk} onClose={() => setBulk(false)}>
        <form noValidate onSubmit={bulkForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Bulk add units"} onOpenChange={(o) => { if (!o) setBulk(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><BulkUnitsFields x={bulkForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={bulkForm.error} busy={bulkForm.busy} submitLabel={bulkForm.submitLabel} onCancel={() => setBulk(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={unitForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={editing === "new" ? "Add unit" : "Edit unit"} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><UnitFields x={unitForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={unitForm.error} busy={unitForm.busy} submitLabel={editing === "new" ? "Add unit" : "Save"} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}
