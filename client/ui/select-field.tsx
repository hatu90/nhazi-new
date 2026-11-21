"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { useTranslations } from "next-intl";
import { fieldStatus, type FieldBase } from "./field-base";

export function SelectField({ label, error, hint, required, disabled, width, value, onChange, options, placeholder, search }: FieldBase & {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  search?: boolean;
}) {
  const t = useTranslations("Common");
  return (
    <Selector
      label={label}
      description={hint}
      options={options}
      value={value}
      onChange={(v) => onChange((v as string | null) ?? "")}
      placeholder={placeholder ?? t("select")}
      hasSearch={search}
      isRequired={required}
      isDisabled={disabled}
      status={fieldStatus(error)}
      width={width}
    />
  );
}
