"use client";

import { useBound, type Common } from "./common";
import type { FieldValues } from "react-hook-form";
import type { ComponentProps } from "react";
import { CheckField } from "../check-field";

export function FCheck<T extends FieldValues>({ control, name, ...rest }: Common<T> & Omit<ComponentProps<typeof CheckField>, "value" | "onChange">) {
  const { field } = useBound({ control, name });
  return <CheckField {...rest} value={Boolean(field.value)} onChange={field.onChange} />;
}
