"use client";

import { formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IUnitListResponse, IUnitResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, TextField } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { BulkUnitsForm } from "../bulk/bulk-units-form";
import { useProperty } from "../property-layout";
import { UnitForm } from "./unit-form";

export function UnitsPage() {
  const { apiPath, canManage } = useProperty();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<IUnitResponse | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const query = useGet<IUnitListResponse>(apiPath("/units"), { page, pageSize: 20, q }, { keepPrevious: true });

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <div className="w-full sm:w-72"><TextField label="Search" type="search" placeholder="Search units…" value={q} onChange={(v) => { setQ(v); setPage(1); }} width="100%" /></div>
        {canManage && <HStack gap={2}><Button label="Bulk add" variant="secondary" onClick={() => setBulk(true)} /><Button label="Add unit" onClick={() => setEditing("new")} /></HStack>}
      </HStack>
      <DataTable<IUnitResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No units" hint="Units are the rooms or apartments you rent out." action={canManage && <Button label="Add the first unit" onClick={() => setEditing("new")} />} />}
        columns={[
          { key: "name", header: "Name", render: (u) => u.name },
          { key: "floor", header: "Floor", render: (u) => u.floor },
          { key: "area", header: "Area", render: (u) => `${u.area} m²` },
          { key: "rooms", header: "Beds / baths", render: (u) => `${u.bedrooms ?? "—"} / ${u.bathrooms ?? "—"}` },
          { key: "rent", header: "Rent", render: (u) => (u.rentNegotiable ? "Negotiable" : formatMoney(u.rentPrice)) },
          { key: "edit", header: "", align: "end", render: (u) => canManage && <Button label="Edit" size="sm" variant="ghost" onClick={() => setEditing(u)} /> },
        ]}
      />
      <Modal wide open={bulk} onClose={() => setBulk(false)} title="Bulk add units">{bulk && <BulkUnitsForm onDone={() => setBulk(false)} onCancel={() => setBulk(false)} />}</Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add unit" : "Edit unit"}>
        {editing && <UnitForm key={editing === "new" ? "new" : editing.id} unit={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </Stack>
  );
}
