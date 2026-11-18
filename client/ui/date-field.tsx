"use client";

import { DateInput } from "@astryxdesign/core/DateInput";
import { fieldStatus, type FieldBase } from "./field-base";

export function DateField({ label, error, hint, required, disabled, width, value, onChange, min, max }: FieldBase & { value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  return (
    <DateInput
      label={label}
      description={hint}
      value={(value || undefined) as never}
      onChange={(v) => onChange(v ?? "")}
      min={min as never}
      max={max as never}
      isRequired={required}
      isDisabled={disabled}
      status={fieldStatus(error)}
      width={width}
    />
  );
}
