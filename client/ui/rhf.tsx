"use client";

/**
 * react-hook-form bindings for the Astryx-backed fields in `./index`. Every form in the app is one column, opened in a
 * <Modal>, and follows the same shape:
 *
 *   const form = useForm<Values>({ defaultValues });
 *   const save = useSend(...);
 *   const submit = useSubmit(form, save, (v) => ({ ...payload }), onDone);
 *   <FormBody onSubmit={submit} mutation={save} submitLabel="Save" onCancel={onDone}>
 *     <FText control={form.control} name="name" label="Name" required />
 *   </FormBody>
 *
 * Field values are strings (so "" can mean "not set"); `build` converts them to the API payload. Validation errors the
 * API returns (422 `fieldErrors`) are put on the matching field by `useSubmit`.
 */
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";
import { useController, type Control, type ControllerProps, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { ApiError } from "@/client/lib/api";
import { CheckField, DateField, ModalBody, MultiField, NumberField, SelectField, TextAreaField, TextField } from "./index";
import { FormError } from "./form";

interface Common<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  required?: boolean;
  rules?: ControllerProps<T>["rules"];
}

function useBound<T extends FieldValues>({ control, name, required, rules }: Common<T>) {
  const { field, fieldState } = useController({ control, name, rules: { ...(required ? { required: "This field is required" } : {}), ...rules } as ControllerProps<T>["rules"] });
  return { field, error: fieldState.error?.message };
}

type Rest<C extends (p: never) => ReactNode> = Omit<Parameters<C>[0], "value" | "onChange" | "error" | "required">;

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

export function FNumber<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof NumberField>) {
  const { field, error } = useBound({ control, name, required, rules });
  return <NumberField {...rest} required={required} value={(field.value as string) ?? ""} onChange={field.onChange} error={error} />;
}

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

export function FArea<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof TextAreaField>) {
  const { field, error } = useBound({ control, name, required, rules });
  return <TextAreaField {...rest} required={required} value={(field.value as string) ?? ""} onChange={field.onChange} error={error} />;
}

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

export function FMulti<T extends FieldValues>({ control, name, required, rules, ...rest }: Common<T> & Rest<typeof MultiField>) {
  const { field, error } = useBound({ control, name, required, rules: { validate: (v: unknown) => !required || (Array.isArray(v) && v.length > 0) || "Select at least one", ...rules } as never });
  return <MultiField {...rest} required={required} value={(field.value as string[]) ?? []} onChange={field.onChange} error={error} />;
}

export function FCheck<T extends FieldValues>({ control, name, ...rest }: Common<T> & Omit<ComponentProps<typeof CheckField>, "value" | "onChange">) {
  const { field } = useBound({ control, name });
  return <CheckField {...rest} value={Boolean(field.value)} onChange={field.onChange} />;
}

/** Put the API's field-level validation messages on the matching form fields. */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, err: unknown) {
  if (!(err instanceof ApiError)) return;
  for (const [name, messages] of Object.entries(err.fieldErrors)) {
    form.setError(name as FieldPath<T>, { type: "server", message: messages[0] });
  }
}

/** `handleSubmit` + mutate + server errors on fields. `build` turns the (string) form values into the request body. */
export function useSubmit<T extends FieldValues, B, R>(form: UseFormReturn<T>, mutation: UseMutationResult<R, Error, B>, build: (values: T) => B, onSuccess?: (result: R) => void) {
  return form.handleSubmit((values) => mutation.mutate(build(values), { onSuccess: (r) => onSuccess?.(r), onError: (e) => applyServerErrors(form, e) }));
}

/**
 * The <form> element for a dialog: fields scroll in the body, the error and the Save / Cancel buttons are pinned in the
 * footer (via <ModalBody>). Must be rendered inside <Modal>.
 */
export function FormBody({ onSubmit, children, error, busy, submitLabel, onCancel }: {
  onSubmit: () => void;
  children: ReactNode;
  error?: unknown;
  busy?: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <ModalBody
        footer={
          <VStack gap={3}>
            <FormError error={error} />
            <HStack gap={2} justify="end">
              <Button label="Cancel" variant="secondary" onClick={onCancel} />
              <Button type="submit" label={submitLabel} isLoading={busy} />
            </HStack>
          </VStack>
        }
      >
        <VStack gap={4}>{children}</VStack>
      </ModalBody>
    </form>
  );
}
