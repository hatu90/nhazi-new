"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { api } from "@/client/lib/api";
import type { IUnitResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { NumberField, TextField } from "@/client/ui";
import { FNumber, FormBody, FText } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";
import { FLOOR_TOKEN, INDEX_TOKEN, nextName, unitNameFor } from "./helpers";

interface Row {
  floor: string;
  name: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  rent: string;
}
interface Values {
  rows: Row[];
}

const MAX_ROWS = 200;
const emptyRow = (): Row => ({ floor: "1", name: "", area: "", bedrooms: "", bathrooms: "", rent: "" });

/** Column layout shared by the header and every row: floor first, then the unit itself. Scrolls sideways on phones. */
const GRID = "grid min-w-[640px] grid-cols-[72px_minmax(150px,1.5fr)_96px_88px_88px_130px_40px] items-start gap-2";
const columns = ["Floor", "Name", "Area (m²)", "Bedrooms", "Bathrooms", "Rent (₫)"];

/**
 * Bulk add units as a grid of inputs, one unit per row, the floor leftmost. New rows start as a copy of the row above
 * (name counted up: "Room 101" -> "Room 102"), so a floor of similar rooms is a few clicks. One all-or-nothing API call.
 */
export function BulkUnitsForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { apiPath } = useProperty();
  const qc = useQueryClient();
  const form = useForm<Values>({ defaultValues: { rows: [emptyRow()] } });
  const rows = useFieldArray({ control: form.control, name: "rows" });
  const count = rows.fields.length;

  const addRows = (count: number) => {
    const current = form.getValues("rows");
    let last = current[current.length - 1] ?? emptyRow();
    const next: Row[] = [];
    for (let k = 0; k < count && current.length + next.length < MAX_ROWS; k++) {
      last = { ...last, name: nextName(last.name) === last.name ? "" : nextName(last.name) };
      next.push(last);
    }
    rows.append(next);
  };

  // "Add a floor": a whole floor's rows at once. Area, bedrooms, bathrooms and rent are copied from the last row.
  const [floorNo, setFloorNo] = useState("");
  const [floorCount, setFloorCount] = useState("4");
  const [pattern, setPattern] = useState(`Room ${FLOOR_TOKEN}${INDEX_TOKEN}`);
  const watchedRows = useWatch({ control: form.control, name: "rows" });
  const lastFloor = Number(watchedRows.at(-1)?.floor);
  const suggestedFloor = Number.isFinite(lastFloor) ? lastFloor + 1 : 1;
  const addFloor = () => {
    const floor = num(floorNo) ?? suggestedFloor;
    const n = Math.min(num(floorCount) ?? 0, MAX_ROWS - count);
    if (n <= 0) return;
    const current = form.getValues("rows");
    const template = current[current.length - 1] ?? emptyRow();
    const fresh = Array.from({ length: n }, (_, k): Row => ({ ...template, floor: String(floor), name: unitNameFor(pattern, floor, k + 1) }));
    // A lone untouched first row is just the form's starting point: replace it instead of keeping an empty unit.
    const onlyBlank = current.length === 1 && !current[0].name.trim() && !current[0].area.trim();
    if (onlyBlank) rows.replace(fresh);
    else rows.append(fresh);
    setFloorNo("");
  };

  const run = useMutation({
    mutationFn: (v: Values) =>
      api<IUnitResponse[]>(apiPath("/units/bulk"), {
        method: "POST",
        body: {
          items: v.rows.map((r) => ({ name: r.name.trim(), floor: num(r.floor), area: num(r.area), bedrooms: num(r.bedrooms), bathrooms: num(r.bathrooms), rentPrice: num(r.rent), rentNegotiable: false })),
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/properties") });
      onDone();
    },
  });

  const submit = form.handleSubmit((v) => {
    const seen = new Map<string, number>();
    let duplicate = false;
    v.rows.forEach((r, i) => {
      const key = r.name.trim().toLowerCase();
      if (seen.has(key)) {
        form.setError(`rows.${i}.name`, { message: `Same as row ${seen.get(key)! + 1}` });
        duplicate = true;
      } else seen.set(key, i);
    });
    if (!duplicate) run.mutate(v);
  });

  return (
    <FormBody onSubmit={submit} error={run.error} busy={run.isPending} submitLabel={`Create ${count} unit${count === 1 ? "" : "s"}`} onCancel={onCancel}>
      <VStack gap={3}>
        <Text size="sm" color="secondary">One unit per row. New rows copy the row above and count the name up, so you only change what differs.</Text>
        <div className="overflow-x-auto">
          <div className="flex flex-col gap-2">
            <div className={GRID} role="row">
              {columns.map((c) => <Text key={c} size="sm" color="secondary" weight="semibold">{c}</Text>)}
              <span />
            </div>
            {rows.fields.map((f, i) => (
              <div key={f.id} className={GRID} role="row">
                <FNumber control={form.control} name={`rows.${i}.floor`} label={`Row ${i + 1} floor`} hideLabel required width="100%" />
                <FText control={form.control} name={`rows.${i}.name`} label={`Row ${i + 1} name`} hideLabel required placeholder="Room 101" width="100%" />
                <FNumber control={form.control} name={`rows.${i}.area`} label={`Row ${i + 1} area`} hideLabel required rules={{ validate: (v) => Number(v) > 0 || "Must be > 0" }} width="100%" />
                <FNumber control={form.control} name={`rows.${i}.bedrooms`} label={`Row ${i + 1} bedrooms`} hideLabel width="100%" />
                <FNumber control={form.control} name={`rows.${i}.bathrooms`} label={`Row ${i + 1} bathrooms`} hideLabel width="100%" />
                <FNumber control={form.control} name={`rows.${i}.rent`} label={`Row ${i + 1} rent`} hideLabel width="100%" />
                <Button label={`Remove row ${i + 1}`} variant="ghost" size="sm" isIconOnly icon="✕" onClick={() => rows.remove(i)} isDisabled={count === 1} />
              </div>
            ))}
          </div>
        </div>
        <HStack gap={2} wrap="wrap">
          <Button label="Add row" size="sm" variant="secondary" onClick={() => addRows(1)} isDisabled={count >= MAX_ROWS} />
          <Button label="Add 5 rows" size="sm" variant="secondary" onClick={() => addRows(5)} isDisabled={count >= MAX_ROWS} />
        </HStack>
        <VStack gap={3}>
          <Text weight="semibold">Add a floor</Text>
          <HStack gap={3} align="end" wrap="wrap">
            <NumberField label="Floor" value={floorNo} onChange={setFloorNo} placeholder={String(suggestedFloor)} width={96} />
            <NumberField label="Units on it" value={floorCount} onChange={setFloorCount} width={120} />
            <TextField label="Name pattern" value={pattern} onChange={setPattern} width={260} />
            <Button label="Add floor" variant="secondary" onClick={addFloor} isDisabled={count >= MAX_ROWS} />
          </HStack>
        </VStack>
      </VStack>
    </FormBody>
  );
}
