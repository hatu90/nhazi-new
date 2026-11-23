"use client";

import { Selector } from "@astryxdesign/core/Selector";
import { Typeahead } from "@astryxdesign/core/Typeahead";
import type { SearchableItem, SearchSource } from "@astryxdesign/core/Typeahead";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { fieldStatus, type FieldBase } from "./field-base";

type Option = { value: string; label: string };

// Lowercase and strip Vietnamese diacritics so "ha noi" matches "Hà Nội".
const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

export function SelectField({ label, error, hint, required, disabled, width, value, onChange, options, placeholder, search }: FieldBase & {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  search?: boolean;
}) {
  const t = useTranslations("Common");

  const items = useMemo<SearchableItem[]>(() => options.map((o) => ({ id: o.value, label: o.label })), [options]);
  const source = useMemo<SearchSource>(() => {
    const indexed = items.map((item) => ({ item, key: fold(item.label) }));
    return {
      bootstrap: () => items,
      search: (query) => {
        const q = fold(query.trim());
        return q ? indexed.filter((x) => x.key.includes(q)).map((x) => x.item) : items;
      },
    };
  }, [items]);

  if (search) {
    return (
      <Typeahead
        label={label}
        description={hint}
        searchSource={source}
        value={items.find((i) => i.id === value) ?? null}
        onChange={(item) => onChange(item?.id ?? "")}
        placeholder={placeholder ?? t("select")}
        hasEntriesOnFocus
        maxMenuItems={100}
        debounceMs={0}
        isRequired={required}
        isDisabled={disabled}
        status={fieldStatus(error)}
        width={width}
      />
    );
  }

  return (
    <Selector
      label={label}
      description={hint}
      options={options}
      value={value}
      onChange={(v) => onChange((v as string | null) ?? "")}
      placeholder={placeholder ?? t("select")}
      isRequired={required}
      isDisabled={disabled}
      status={fieldStatus(error)}
      width={width}
    />
  );
}
