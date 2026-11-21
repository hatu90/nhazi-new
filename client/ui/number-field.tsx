"use client";

import { NumberInput } from "@astryxdesign/core/NumberInput";
import { fieldStatus, type FieldBase } from "./field-base";
import { formatMoney } from "@/client/lib/format";

/** Money is typed in thousands of ₫ (3 500 = 3 500 000 ₫): fewer digits to mistype. */
const MONEY_SCALE = 1000;

/**
 * Numeric input that keeps its value as a string ("" = empty), so forms can distinguish "unset" from 0.
 * - `unit`: suffix shown inside the input (m², kWh, %…).
 * - `money`: the user types thousands of ₫; the value stays the full amount in ₫. The description spells out the full amount.
 */
export function NumberField({ label, error, hint, required, disabled, width, value, onChange, placeholder, hideLabel, unit, money }: FieldBase & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hideLabel?: boolean;
  unit?: string;
  money?: boolean;
}) {
  const scale = money ? MONEY_SCALE : 1;
  const full = value === "" || Number.isNaN(Number(value)) ? null : Number(value);
  const shown = full === null ? null : full / scale;
  const description = hideLabel ? undefined : money
    ? [full === null ? "" : formatMoney(full), hint].filter(Boolean).join(" · ")
    : hint;
  return (
    <NumberInput
      label={label}
      isLabelHidden={hideLabel}
      description={description}
      value={shown}
      hasClear
      onChange={(n) => onChange(n === null ? "" : String(Math.round(n * scale * 1e6) / 1e6))}
      units={money ? "x1000₫" : unit}
      hasNumberSteppers={false}
      isWheelEnabled={false}
      placeholder={placeholder}
      isRequired={required}
      isDisabled={disabled}
      status={fieldStatus(error)}
      width={width}
    />
  );
}
