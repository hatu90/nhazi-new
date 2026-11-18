"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { NumberField } from "../number-field";

export function FNumber<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof NumberField>) {
  const { field, error } = useBound({ control, name, required, rules });
  return <NumberField {...rest} required={required} value={(field.value as string) ?? ""} onChange={field.onChange} error={error} />;
}
