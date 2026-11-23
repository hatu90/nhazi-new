"use client";

import { DropZone, type Config } from "@puckeditor/core";
import type { useTranslations } from "next-intl";
import { Content } from "./content";
import { TextBlock } from "./text-block";
import "./document.css";
import { FieldFrame } from "./field-frame";
import { leaseContractVi } from "./lease-contract-vi";
import { AgreementDocument, Components, ContentProps, TemplatePage, TextInputProps, TextProps } from "./types";

export const DEFAULT_PAGE_PROPS: ContentProps = { paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12 };

type Tr = ReturnType<typeof useTranslations<"AgreementEditor">>;

const textInputFields = (t: Tr) => ({
  name: { type: "text", label: t("fieldName") },
  label: { type: "text", label: t("label") },
  unit: { type: "text", label: t("unit") },
  inputType: { type: "select", label: t("inputType"), options: [{ label: t("typeText"), value: "text" }, { label: t("typeTextarea"), value: "textarea" }] },
  labelPosition: { type: "select", label: t("labelPosition"), options: [{ label: t("top"), value: "top" }, { label: t("bottom"), value: "bottom" }, { label: t("left"), value: "left" }, { label: t("right"), value: "right" }] },
  defaultValue: { type: "text", label: t("defaultValue") },
  fontSize: { type: "number", label: t("fontSize"), min: 8, max: 72 },
  lineHeight: { type: "number", label: t("lineHeight"), min: 1, max: 3, step: 0.1 },
  placeholder: { type: "text", label: t("placeholder") },
  rows: { type: "number", label: t("rows"), min: 2, max: 20 },
}) as const;

/** Base config = the editor. The fill form and the result swap `TextInput.render` (see form.tsx / result.tsx). */
export const createConfig = (t: Tr): Config<Components> => ({
  root: { render: ({ children }) => <main className="template-pages">{children}</main> },
  components: {
    Content: {
      label: t("page"),
      fields: {
        paddingTop: { type: "number", label: t("paddingTop") },
        paddingRight: { type: "number", label: t("paddingRight") },
        paddingBottom: { type: "number", label: t("paddingBottom") },
        paddingLeft: { type: "number", label: t("paddingLeft") },
      },
      defaultProps: DEFAULT_PAGE_PROPS,
      render: Content,
    },
    Text: {
      label: t("text"),
      fields: {
        text: { type: "textarea", label: t("textHelp") },
        weight: { type: "select", label: t("weight"), options: [{ label: t("normal"), value: "normal" }, { label: t("semibold"), value: "semibold" }, { label: t("bold"), value: "bold" }] },
        align: { type: "select", label: t("align"), options: [{ label: t("start"), value: "start" }, { label: t("center"), value: "center" }, { label: t("end"), value: "end" }] },
        fontSize: { type: "number", label: t("fontSize"), min: 8, max: 96 },
        lineHeight: { type: "number", label: t("lineHeight"), min: 0.8, max: 3, step: 0.1 },
      },
      defaultProps: { text: t("text"), weight: "normal", align: "start", fontSize: 14, lineHeight: 1.5 },
      render: TextBlock,
    },
    TextInput: {
      label: t("textInput"),
      fields: textInputFields(t),
      defaultProps: { name: t("defaultFieldName"), label: t("label"), unit: "", inputType: "text", labelPosition: "top", defaultValue: "", fontSize: 14, lineHeight: 1.5, placeholder: "", rows: 4 },
      // editor preview: an empty box, so it is clear this becomes an input on the lease
      render: ({ name, label, unit, labelPosition, fontSize, lineHeight, inputType, rows = 4 }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <div style={{ border: "1px dashed #9ca3af", borderRadius: 4, padding: "4px 8px", minHeight: inputType === "textarea" ? rows * 20 : 28, fontSize: 12, color: "#6b7280" }}>
            [{name}]{unit ? ` ${unit}` : ""}
          </div>
        </FieldFrame>
      ),
    },
    DateInput: {
      label: t("dateInput"),
      fields: {
        name: { type: "text", label: t("fieldName") },
        label: { type: "text", label: t("label") },
        labelPosition: textInputFields(t).labelPosition,
        defaultValue: { type: "text", label: t("defaultDate") },
        fontSize: { type: "number", label: t("fontSize"), min: 8, max: 72 },
        lineHeight: { type: "number", label: t("lineHeight"), min: 1, max: 3, step: 0.1 },
      },
      defaultProps: { name: t("defaultFieldName"), label: t("label"), labelPosition: "top", defaultValue: "", fontSize: 14, lineHeight: 1.5 },
      render: ({ name, label, labelPosition, fontSize, lineHeight }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <div style={{ border: "1px dashed #9ca3af", borderRadius: 4, padding: "4px 8px", minHeight: 28, fontSize: 12, color: "#6b7280" }}>[{name}] dd/mm/yyyy</div>
        </FieldFrame>
      ),
    },
    ImageUpload: {
      label: t("imageUpload"),
      fields: {
        name: { type: "text", label: t("fieldName") },
        label: { type: "text", label: t("label") },
        labelPosition: textInputFields(t).labelPosition,
        height: { type: "number", label: t("imageHeight"), min: 40, max: 600 },
        fontSize: { type: "number", label: t("fontSize"), min: 8, max: 72 },
        lineHeight: { type: "number", label: t("lineHeight"), min: 1, max: 3, step: 0.1 },
      },
      defaultProps: { name: t("defaultFieldName"), label: t("label"), labelPosition: "top", height: 120, fontSize: 14, lineHeight: 1.5 },
      render: ({ name, label, labelPosition, height, fontSize, lineHeight }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <div style={{ border: "1px dashed #9ca3af", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", height, fontSize: 12, color: "#6b7280" }}>[{name}] image</div>
        </FieldFrame>
      ),
    },
    Grid: {
      label: t("grid"),
      fields: {},
      render: () => <DropZone zone="grid" allow={["GridItem"]} style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridAutoRows: "minmax(40px, auto)", gap: 8, width: "100%", minHeight: 100 }} />,
    },
    GridItem: {
      label: t("gridCell"),
      inline: true,
      fields: { columns: { type: "number", label: t("columns"), min: 1, max: 12 }, rows: { type: "number", label: t("rows"), min: 1, max: 20 } },
      defaultProps: { columns: 6, rows: 1 },
      render: ({ columns, rows, puck }) => <DropZone ref={puck.dragRef} zone="content" disallow={["GridItem"]} style={{ gridColumn: `span ${columns}`, gridRow: `span ${rows}`, minWidth: 0, minHeight: 40 }} minEmptyHeight="40px" />,
    },
    Divider: {
      label: t("divider"),
      fields: { thickness: { type: "number", label: t("thickness") } },
      defaultProps: { thickness: 1 },
      render: ({ thickness }) => <hr style={{ border: 0, borderTop: `${thickness}px solid currentColor` }} />,
    },
    Spacer: {
      label: t("spacer"),
      fields: { height: { type: "number", label: t("height") } },
      defaultProps: { height: 16 },
      render: ({ height }) => <div style={{ height }} />,
    },
  },
});

/** Render-only config (fill form, result): editor labels are never shown there, so keys stand in for them. */
export const config = createConfig(((key: string) => key) as unknown as Tr);

export const emptyPage = (): TemplatePage => ({ content: [{ type: "Content", props: { id: `page-${crypto.randomUUID().slice(0, 8)}`, ...DEFAULT_PAGE_PROPS } }], root: { props: {} }, zones: {} }) as TemplatePage;

export function toPages(data: unknown): TemplatePage[] {
  const d = data as { pages?: TemplatePage[] } | null;
  if (d && Array.isArray(d.pages)) return d.pages.length > 0 ? d.pages : [emptyPage()];
  return d ? [d as unknown as TemplatePage] : [emptyPage()];
}

/** What a new template starts with: the Vietnamese residential lease form. */
export const starterDocument = (): AgreementDocument => leaseContractVi();
