"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toPages } from "./config";
import { FieldFrame } from "./field-frame";
import { AgreementVars } from "./fill-context";
import { formFields, withDefaults } from "./metadata";
import { PageStack } from "./page-stack";
import { withTextInput } from "./with-text-input";

/** Result: the same sheets with the typed values in place of the inputs. */
export function AgreementResult({ data, values, vars }: { data: unknown; values: Record<string, string>; vars: Record<string, string> }) {
  const pages = useMemo(() => toPages(data), [data]);
  const cfg = useMemo(
    () =>
      withTextInput(({ name, label, unit, labelPosition, fontSize, lineHeight }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize, lineHeight, minHeight: lineHeight * fontSize }}>
            {values[name] || ""}
            {unit ? <strong> {unit}</strong> : null}
          </p>
        </FieldFrame>
      )),
    [values],
  );
  return (
    <AgreementVars value={vars}>
      <PageStack config={cfg} pages={pages} />
    </AgreementVars>
  );
}

export const useAgreementForm = (data: unknown, stored: unknown) =>
  useForm<Record<string, string>>({ defaultValues: withDefaults(toPages(data), stored) });

export const hasFields = (data: unknown) => formFields(toPages(data)).length > 0;
