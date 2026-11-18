import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { ApiError } from "@/client/lib/api";

/** Put the API's field-level validation messages on the matching form fields. */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown) {
  if (!(err instanceof ApiError)) return;
  for (const [name, messages] of Object.entries(err.fieldErrors)) {
    form.setError(name as FieldPath<T>, { type: "server", message: messages[0] });
  }
}
