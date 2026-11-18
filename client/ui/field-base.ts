export interface FieldBase {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  width?: string | number;
}
export const fieldStatus = (error?: string) => (error ? ({ type: "error", message: error } as const) : undefined);
