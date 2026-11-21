/**
 * react-hook-form bindings for the Astryx-backed fields. A form dialog is owned by the page that opens it:
 *
 *   // <thing>-form.tsx
 *   export function useThingForm({ open, onDone }) {
 *     const form = useForm<Values>({ defaultValues });
 *     const save = useSend(...);
 *     useOpenReset(open, () => { form.reset(defaultValues); save.reset(); });
 *     const submit = useSubmit(form, save, (v) => ({ ...payload }), onDone);
 *     return { form, submit, error: save.error, busy: save.isPending };
 *   }
 *   export function ThingFields({ x }: { x: ReturnType<typeof useThingForm> }) {
 *     return <VStack gap={4}><FText control={x.form.control} name="name" label="Name" required /></VStack>;
 *   }
 *
 *   // page: <Modal><form onSubmit={x.submit}><Layout header content footer/></form></Modal>  (see `Modal`)
 *
 * Field values are strings (so "" can mean "not set"); `build` converts them to the API payload. Validation errors the
 * API returns (422 `fieldErrors`) are put on the matching field by `useSubmit`.
 */
export { FText } from "./f-text";
export { FNumber } from "./f-number";
export { FDate } from "./f-date";
export { FArea } from "./f-area";
export { FSelect } from "./f-select";
export { FMulti } from "./f-multi";
export { FCheck } from "./f-check";
export { applyServerErrors } from "./apply-server-errors";
export { useSubmit } from "./use-submit";
export { FormFooter } from "./form-footer";
export { useOpenReset } from "./use-open-reset";
