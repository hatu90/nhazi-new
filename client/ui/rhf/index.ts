/**
 * react-hook-form bindings for the Astryx-backed fields. Every form in the app is one column, opened in a <Modal>:
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
export { FText } from "./f-text";
export { FNumber } from "./f-number";
export { FDate } from "./f-date";
export { FArea } from "./f-area";
export { FSelect } from "./f-select";
export { FMulti } from "./f-multi";
export { FCheck } from "./f-check";
export { applyServerErrors } from "./apply-server-errors";
export { useSubmit } from "./use-submit";
export { FormBody } from "./form-body";
