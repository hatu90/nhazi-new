"use client";

import { useBound, type Common, type Rest } from "./common";
import type { FieldValues } from "react-hook-form";
import { TextAreaField } from "../text-area-field";

export function FArea<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof TextAreaField>) {
  const { field, error } = useBound({ control, name, required, rules });
  return <TextAreaField {...rest} required={required} value={(field.value as string) ?? ""} onChange={field.onChange} error={error} />;
}
