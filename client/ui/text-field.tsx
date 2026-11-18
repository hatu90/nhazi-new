"use client";

import { TextInput } from "@astryxdesign/core/TextInput";
import { fieldStatus, type FieldBase } from "./field-base";

export function TextField({ label, error, hint, required, disabled, width, value, onChange, type, placeholder, autoFocus, autoComplete, inputMode, maxLength, hideLabel }: FieldBase & {
  /** Visually hidden label (still read by screen readers): for cells in a grid whose header names the column. */
  hideLabel?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "search" | "password";
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "decimal" | "tel" | "text";
  maxLength?: number;
}) {
  return (
    <TextInput
      label={label}
      isLabelHidden={hideLabel}
      description={hint}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      isRequired={required}
      isDisabled={disabled}
      hasAutoFocus={autoFocus}
      autoComplete={autoComplete as never}
      inputMode={inputMode}
      status={fieldStatus(error)}
      width={width}
      {...(maxLength ? { maxLength } : {})}
    />
  );
}
