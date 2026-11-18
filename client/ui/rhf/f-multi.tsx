"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { MultiField } from "../multi-field";

export function FMulti<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof MultiField>) {
  const { field, error } = useBound({ control, name, required, rules: { validate: (v: unknown) => !required || (Array.isArray(v) && v.length > 0) || "Select at least one", ...rules } as never });
  return <MultiField {...rest} required={required} value={(field.value as string[]) ?? []} onChange={field.onChange} error={error} />;
}
