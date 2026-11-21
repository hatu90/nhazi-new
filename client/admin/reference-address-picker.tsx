"use client";

import { useMemo } from "react";
import { api } from "@/client/lib/api";
import type { IReferenceAddressListResponse } from "@/client/lib/types";
import { NumberField } from "@/client/ui";
import { Card } from "@astryxdesign/core/Card";
import { IconButton } from "@astryxdesign/core/IconButton";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Typeahead, type SearchableItem, type SearchSource } from "@astryxdesign/core/Typeahead";
import { X } from "lucide-react";

/** One reference address on the property form. `id` is unset for a place that is about to be created (by `name`). */
export interface RefAddressDraft {
  id?: string;
  name: string;
  /** meters; "" = unknown */
  distance: string;
}

/** Same rule as the server's slug: lowercase, no diacritics, hyphens. Used only to spot an exact match. */
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** `id` is the reference address id, or "new" for the "Add “…”" row (then `label` is the typed name). */
type Item = SearchableItem<{ isNew: boolean }>;

/** Search the shared list of reference places and add one (or a brand-new one by name), each with its distance in meters. */
export function ReferenceAddressPicker({ value, onChange }: { value: RefAddressDraft[]; onChange: (v: RefAddressDraft[]) => void }) {
  // rebuilt when the added places change, so already-added ones are left out of the results
  const takenKey = value.map((v) => slug(v.name)).join("|");

  const source = useMemo<SearchSource<Item>>(() => {
    const taken = new Set(takenKey ? takenKey.split("|") : []);
    const search = async (query: string): Promise<Item[]> => {
      const q = query.trim();
      const res = await api<IReferenceAddressListResponse>("/api/public/reference-addresses", { query: { q: q || undefined, pageSize: 8 } });
      const items: Item[] = res.items.filter((r) => !taken.has(r.slug)).map((r) => ({ id: r.id, label: r.name, auxiliaryData: { isNew: false } }));
      const s = slug(q);
      if (s && !taken.has(s) && !res.items.some((r) => r.slug === s)) items.push({ id: "new", label: q, auxiliaryData: { isNew: true } });
      return items;
    };
    return { search, bootstrap: () => search("") };
  }, [takenKey]);

  const patch = (i: number, distance: string) => onChange(value.map((v, j) => (j === i ? { ...v, distance } : v)));

  return (
    <VStack gap={3}>
      {value.map((v, i) => (
        <Card key={v.id ?? `new:${slug(v.name)}`} padding={4}>
        <VStack gap={2}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: "1 1 0%", minWidth: 0 }}>
              <Text weight="medium">{i + 1}. {v.name}</Text>
              {!v.id && <Text size="sm" color="secondary">New place</Text>}
            </div>
            <IconButton label={`Remove ${v.name}`} variant="ghost" icon={<X />} onClick={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
          <NumberField label="Distance" unit="m" value={v.distance} onChange={(d) => patch(i, d)} width="100%" />
        </VStack>
        </Card>
      ))}

      <Typeahead<Item>
        label="Add a nearby place"
        description="Search an industrial zone, university, hospital… or add a new one."
        placeholder="e.g. Khu công nghiệp Yên Phong"
        searchSource={source}
        value={null}
        onChange={(item) => {
          if (!item) return;
          onChange([...value, item.auxiliaryData?.isNew ? { name: item.label, distance: "" } : { id: item.id, name: item.label, distance: "" }]);
        }}
        renderItem={(item) => (item.auxiliaryData?.isNew ? <Text>Add “{item.label}”</Text> : <Text>{item.label}</Text>)}
        hasEntriesOnFocus
        width="100%"
      />
    </VStack>
  );
}
