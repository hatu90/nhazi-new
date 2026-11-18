"use client";

import { InputGroup, InputGroupText } from "@astryxdesign/core/InputGroup";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput as AstryxTextInput } from "@astryxdesign/core/TextInput";
import { Render, type Config } from "@puckeditor/core";
import { useMemo } from "react";
import { Controller, FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { AgreementVars, FieldFrame, config, toPages, type Components } from "./config";
import { formFields, withDefaults } from "./metadata";

/** Every template page as its own A4 sheet. */
function PageStack({ config: cfg, pages }: { config: Config<Components>; pages: ReturnType<typeof toPages> }) {
  return (
    <div className="document-pages">
      {pages.map((page, i) => (
        <div className="document-page" key={i}>
          <Render config={cfg} data={page} />
        </div>
      ))}
    </div>
  );
}

const withTextInput = (render: NonNullable<Config<Components>["components"]["TextInput"]>["render"]): Config<Components> => ({
  ...config,
  components: { ...config.components, TextInput: { ...config.components.TextInput, render } },
});

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

export const useAgreementForm = (data: unknown, stored: unknown) =>
  useForm<Record<string, string>>({ defaultValues: withDefaults(toPages(data), stored) });

export const hasFields = (data: unknown) => formFields(toPages(data)).length > 0;
