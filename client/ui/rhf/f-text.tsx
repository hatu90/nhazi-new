"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { TextField } from "../text-field";

export function FText<T extends FieldValues>({ control, name, required, rules, onValueChange, ...rest }: Common<T> & Rest<typeof TextField> & { onValueChange?: (v: string) => void }) {
  const { field, error } = useBound({ control, name, required, rules });
  return (
    <TextField
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
