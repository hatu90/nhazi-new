"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
import { FNumber, FText, useOpenReset } from "@/client/ui/rhf";
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
// Floor and name stay in view while the row scrolls sideways (floor is 72px wide + 8px gap).
const PIN_FLOOR = "sticky left-0 z-10 bg-white shadow-[8px_0_0_0_white]";
const PIN_NAME = "sticky left-[80px] z-20 bg-white shadow-[8px_0_0_0_white]";
const GRID = "grid min-w-[700px] grid-cols-[72px_96px_96px_88px_88px_170px_40px] items-start gap-2";

/**
 * Bulk add units as a grid of inputs, one unit per row, the floor leftmost. New rows start as a copy of the row above
 * (name counted up: "Room 101" -> "Room 102"), so a floor of similar rooms is a few clicks. One all-or-nothing API call.
 */
export function useBulkUnitsForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const t = useTranslations("Units");
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
  const [pattern, setPattern] = useState(`${t("roomWord")} ${FLOOR_TOKEN}${INDEX_TOKEN}`);
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

  useOpenReset(open, () => { form.reset({ rows: [emptyRow()] }); run.reset(); setFloorNo(""); setFloorCount("4"); setPattern(`${t("roomWord")} ${FLOOR_TOKEN}${INDEX_TOKEN}`); });
  const submit = form.handleSubmit((v) => {
    const seen = new Map<string, number>();
    let duplicate = false;
    v.rows.forEach((r, i) => {
      const key = r.name.trim().toLowerCase();
      if (seen.has(key)) {
        form.setError(`rows.${i}.name`, { message: t("sameAsRow", { n: seen.get(key)! + 1 }) });
        duplicate = true;
      } else seen.set(key, i);
    });
    if (!duplicate) run.mutate(v);
  });

  return { form, submit, error: run.error, busy: run.isPending, submitLabel: t("createUnits", { count }), rows, count, addRows, addFloor, floorNo, setFloorNo, floorCount, setFloorCount, pattern, setPattern, suggestedFloor };
}

export function BulkUnitsFields({ x: { form, rows, count, addRows, addFloor, floorNo, setFloorNo, floorCount, setFloorCount, pattern, setPattern, suggestedFloor } }: { x: ReturnType<typeof useBulkUnitsForm> }) {
  const t = useTranslations("Units");
  const c = useTranslations("Common");
  const columns = [t("floor"), c("name"), t("areaCol"), t("bedrooms"), t("bathrooms"), t("rentCol")];
  const field = (name: string, n: number) => t("rowField", { field: name, n });
  return (
      <VStack gap={3}>
        <div className="overflow-x-auto">
          <div className="flex flex-col gap-2">
            <div className={GRID} role="row">
              {columns.map((col, k) => <Text key={col} size="sm" color="secondary" weight="semibold" className={k === 0 ? PIN_FLOOR : k === 1 ? PIN_NAME : undefined}>{col}</Text>)}
              <span />
            </div>
            {rows.fields.map((f, i) => (
              <div key={f.id} className={GRID} role="row">
                <div className={PIN_FLOOR}><FNumber control={form.control} name={`rows.${i}.floor`} label={field(t("floor"), i + 1)} hideLabel required width="100%" /></div>
                <div className={PIN_NAME}><FText control={form.control} name={`rows.${i}.name`} label={field(c("name"), i + 1)} hideLabel required width="100%" /></div>
                <FNumber control={form.control} name={`rows.${i}.area`} label={field(t("area"), i + 1)} hideLabel unit="m²" required rules={{ validate: (v) => Number(v) > 0 || t("gtZero") }} width="100%" />
                <FNumber control={form.control} name={`rows.${i}.bedrooms`} label={field(t("bedrooms"), i + 1)} hideLabel width="100%" />
                <FNumber control={form.control} name={`rows.${i}.bathrooms`} label={field(t("bathrooms"), i + 1)} hideLabel width="100%" />
                <FNumber control={form.control} name={`rows.${i}.rent`} label={field(t("rent"), i + 1)} hideLabel money width="100%" />
                <Button label={t("removeRow", { n: i + 1 })} variant="ghost" size="sm" isIconOnly icon="✕" onClick={() => rows.remove(i)} isDisabled={count === 1} />
              </div>
            ))}
          </div>
        </div>
        <HStack gap={2} wrap="wrap">
          <Button icon={<Plus size={16} />} label={t("addRow")} size="sm" variant="secondary" onClick={() => addRows(1)} isDisabled={count >= MAX_ROWS} />
          <Button icon={<Plus size={16} />} label={t("addRows")} size="sm" variant="secondary" onClick={() => addRows(5)} isDisabled={count >= MAX_ROWS} />
        </HStack>
        <VStack gap={3}>
          <Text weight="semibold">{t("addFloor")}</Text>
          <HStack gap={3} align="end" wrap="wrap">
            <div className="w-24"><NumberField label={t("floor")} value={floorNo} onChange={setFloorNo} placeholder={String(suggestedFloor)} width="100%" /></div>
            <div className="w-28"><NumberField label={t("unitsOnIt")} value={floorCount} onChange={setFloorCount} width="100%" /></div>
            <div className="w-full min-w-0 sm:w-64"><TextField label={t("namePattern")} value={pattern} onChange={setPattern} width="100%" /></div>
            <Button icon={<Plus size={16} />} label={t("addFloor")} variant="secondary" onClick={addFloor} isDisabled={count >= MAX_ROWS} />
          </HStack>
        </VStack>
      </VStack>
  );
}
