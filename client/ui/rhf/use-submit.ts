import type { UseMutationResult } from "@tanstack/react-query";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { applyServerErrors } from "./apply-server-errors";

/** `handleSubmit` + mutate + server errors on fields. `build` turns the (string) form values into the request body. */
export function useSubmit<T extends FieldValues, B, R>(form: UseFormReturn<T>, mutation: UseMutationResult<R, Error, B>, build: (values: T) => B, onSuccess?: (result: R) => void) {
  return form.handleSubmit((values) => mutation.mutate(build(values), { onSuccess: (r) => onSuccess?.(r), onError: (e) => applyServerErrors(form, e) }));
}
