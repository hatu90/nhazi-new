import type { ReactNode } from "react";
import { useController, type Control, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";

export interface Common<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  required?: boolean;
  rules?: ControllerProps<T>["rules"];
}

export function useBound<T extends FieldValues>({ control, name, required, rules }: Common<T>) {
  const { field, fieldState } = useController({ control, name, rules: { ...(required ? { required: "This field is required" } : {}), ...rules } as ControllerProps<T>["rules"] });
  return { field, error: fieldState.error?.message };
}

export type Rest<C extends (p: never) => ReactNode> = Omit<Parameters<C>[0], "value" | "onChange" | "error" | "required">;
