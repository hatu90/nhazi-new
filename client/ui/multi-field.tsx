"use client";

import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { useTranslations } from "next-intl";
import { fieldStatus, type FieldBase } from "./field-base";

export function MultiField({ label, error, hint, required, disabled, width, value, onChange, options, placeholder }: FieldBase & {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const t = useTranslations("Common");
  return <MultiSelector label={label} description={hint} options={options} value={value} onChange={(v) => onChange(v)} placeholder={placeholder ?? t("select")} hasSelectAll isRequired={required} isDisabled={disabled} status={fieldStatus(error)} width={width} />;
}
