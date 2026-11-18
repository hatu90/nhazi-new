"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { DateField } from "../date-field";

export function FDate<T extends FieldValues>({ control, name, required, rules, onChange, ...rest }: Common<T> & Rest<typeof DateField> & { onChange?: (v: string) => void }) {
  const { field, error } = useBound({ control, name, required, rules });
  return (
    <DateField
      {...rest}
      required={required}
      value={(field.value as string) ?? ""}
      onChange={(v) => {
        field.onChange(v);
        onChange?.(v);
      }}
      error={error}
    />
  );
}
