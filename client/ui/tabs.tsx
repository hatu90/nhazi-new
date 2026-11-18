"use client";

import { Tab, TabList } from "@astryxdesign/core/TabList";

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <TabList value={value} onChange={(v) => onChange(v as T)} hasDivider overflow="scroll">
      {tabs.map((t) => <Tab key={t.id} value={t.id} label={t.label} />)}
    </TabList>
  );
}
