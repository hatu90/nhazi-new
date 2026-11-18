"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { SelectField } from "../select-field";

export function FSelect<T extends FieldValues>({ control, name, required, rules, onValueChange, ...rest }: Common<T> & Rest<typeof SelectField> & { onValueChange?: (v: string) => void }) {
  const { field, error } = useBound({ control, name, required, rules });
  return (
    <SelectField
      {...rest}
      required={required}
      value={(field.value as string) ?? ""}
      onChange={(v) => {
        onValueChange?.(v); // runs before the field updates, so it can still read the previous value
        field.onChange(v);
      }}
      error={error}
    />
  );
}
