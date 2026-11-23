"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toPages } from "./config";
import { FieldFrame } from "./field-frame";
import { AgreementVars } from "./fill-context";
import { formFields, withDefaults } from "./metadata";
import { PageStack } from "./page-stack";
import { withRenderers } from "./with-renderers";
import { StoredImage } from "./image-upload";
import { formatDate } from "@/client/lib/format";

/** Result: the same sheets with the typed values in place of the inputs. */
export function AgreementResult({ data, values, vars }: { data: unknown; values: Record<string, string>; vars: Record<string, string> }) {
  const pages = useMemo(() => toPages(data), [data]);
  const cfg = useMemo(
    () =>
      withRenderers({
        TextInput: ({ name, label, unit, labelPosition, fontSize, lineHeight }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize, lineHeight, minHeight: lineHeight * fontSize }}>
            {values[name] || ""}
            {unit ? <strong> {unit}</strong> : null}
          </p>
        </FieldFrame>
        ),
        DateInput: ({ name, label, labelPosition, fontSize, lineHeight }) => (
          <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
            <p style={{ margin: 0, fontSize, lineHeight, minHeight: lineHeight * fontSize }}>{values[name] ? formatDate(values[name]) : ""}</p>
          </FieldFrame>
        ),
        ImageUpload: ({ name, label, labelPosition, height, fontSize, lineHeight }) => (
          <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
            <StoredImage path={values[name] ?? ""} height={height} alt={label} />
          </FieldFrame>
        ),
      }),
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
