"use client";

import { TextArea } from "@astryxdesign/core/TextArea";
import { fieldStatus, type FieldBase } from "./field-base";

export function TextAreaField({ label, error, hint, required, disabled, width, value, onChange, rows }: FieldBase & { value: string; onChange: (v: string) => void; rows?: number }) {
  return <TextArea label={label} description={hint} value={value} onChange={onChange} rows={rows ?? 3} isRequired={required} isDisabled={disabled} status={fieldStatus(error)} width={width} />;
}
