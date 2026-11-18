"use client";

import type { FieldBase } from "./field-base";
import { TextField } from "./text-field";

/** Numeric input that keeps its value as a string ("" = empty), so forms can distinguish "unset" from 0. */
export function NumberField(props: FieldBase & { value: string; onChange: (v: string) => void; placeholder?: string; hideLabel?: boolean }) {
  return <TextField {...props} inputMode="decimal" onChange={(v) => props.onChange(v.replace(/[^\d.\-]/g, ""))} />;
}
