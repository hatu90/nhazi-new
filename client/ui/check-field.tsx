"use client";

import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";

export function CheckField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return <CheckboxInput label={label} description={hint} value={value} onChange={onChange} />;
}
