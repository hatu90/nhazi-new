"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { formatMoney } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IUnitListResponse, IUnitResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, TextField } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import { FArea, FCheck, FNumber, FormBody, FText, useSubmit } from "@/client/ui/rhf";
import { BulkUnitsForm } from "../bulk/bulk-units-form";
import { useProperty } from "../property-layout";

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

interface UnitValues {
  name: string;
  area: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  rentPrice: string;
  rentNegotiable: boolean;
  description: string;
}

function UnitForm({ unit, onDone }: { unit?: IUnitResponse; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>(unit ? "PATCH" : "POST", unit ? apiPath(`/units/${unit.id}`) : apiPath("/units"), [apiPath("/units"), "/api/admin/properties"]);
  const form = useForm<UnitValues>({
    defaultValues: {
      name: unit?.name ?? "",
      area: unit?.area.toString() ?? "",
      floor: unit?.floor.toString() ?? "1",
      bedrooms: unit?.bedrooms?.toString() ?? "",
      bathrooms: unit?.bathrooms?.toString() ?? "",
      rentPrice: unit?.rentPrice?.toString() ?? "",
      rentNegotiable: unit?.rentNegotiable ?? false,
      description: unit?.description ?? "",
    },
  });
  // Edit sends null to clear an emptied field; create simply omits it.
  const empty = unit ? null : undefined;
  const submit = useSubmit(
    form,
    save,
    (v) => ({ name: v.name.trim(), area: num(v.area), floor: num(v.floor), bedrooms: num(v.bedrooms) ?? empty, bathrooms: num(v.bathrooms) ?? empty, rentPrice: num(v.rentPrice) ?? empty, rentNegotiable: v.rentNegotiable, description: text(v.description) ?? empty }),
    onDone,
  );
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={unit ? "Save" : "Add unit"} onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FNumber control={form.control} name="area" label="Area (m²)" required width="100%" />
      <FNumber control={form.control} name="floor" label="Floor" required width="100%" />
      <FNumber control={form.control} name="bedrooms" label="Bedrooms" width="100%" />
      <FNumber control={form.control} name="bathrooms" label="Bathrooms" width="100%" />
      <FNumber control={form.control} name="rentPrice" label="Rent (₫ / month)" width="100%" />
      <FCheck control={form.control} name="rentNegotiable" label="Negotiable" />
      <FArea control={form.control} name="description" label="Description" width="100%" />
    </FormBody>
  );
}
