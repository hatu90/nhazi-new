"use client";

import { InputGroup, InputGroupText } from "@astryxdesign/core/InputGroup";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput as AstryxTextInput } from "@astryxdesign/core/TextInput";
import { useMemo } from "react";
import { Controller, FormProvider, type UseFormReturn } from "react-hook-form";
import { toPages } from "./config";
import { PageStack } from "./page-stack";
import { withTextInput } from "./with-text-input";
import { AgreementVars } from "./fill-context";
import { FieldFrame } from "./field-frame";

/** The fields of the template as a react-hook-form form; the sheets are the layout. */
export function AgreementFormFields({ form, data, vars }: { form: UseFormReturn<Record<string, string>>; data: unknown; vars: Record<string, string> }) {
  const pages = useMemo(() => toPages(data), [data]);
  const cfg = useMemo(
    () =>
      withTextInput(({ name, label, unit, labelPosition, inputType, fontSize, lineHeight, placeholder, rows = 4 }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <Controller
            name={name}
            render={({ field }) => (
              <InputGroup label={label} isLabelHidden>
                {inputType === "textarea" ? (
                  <TextArea ref={field.ref} label={label} isLabelHidden value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} placeholder={placeholder} rows={rows} width="100%" controlStyle={{ width: "100%", boxSizing: "border-box", fontSize, lineHeight, resize: "vertical" }} />
                ) : (
                  <AstryxTextInput ref={field.ref} label={label} isLabelHidden value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} placeholder={placeholder} controlStyle={{ fontSize, lineHeight }} />
                )}
                {unit && <InputGroupText>{unit}</InputGroupText>}
              </InputGroup>
            )}
          />
        </FieldFrame>
      )),
    [],
  );
  return (
    <AgreementVars value={vars}>
      <FormProvider {...form}>
        <PageStack config={cfg} pages={pages} />
      </FormProvider>
    </AgreementVars>
  );
}
