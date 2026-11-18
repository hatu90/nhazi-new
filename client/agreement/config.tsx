"use client";

import { DropZone, type Config, type Data } from "@puckeditor/core";
import { createContext, useContext, type CSSProperties } from "react";
import "./document.css";
import { fillText } from "./vars";

/** Values for {{placeholders}} in Text blocks. Empty in the editor, which shows the raw {{keys}}. */
export const AgreementVars = createContext<Record<string, string>>({});
export const useFill = () => {
  const vars = useContext(AgreementVars);
  return (text: string) => fillText(text, vars);
};

export type TextProps = { text: string; weight: "normal" | "semibold" | "bold"; align: "start" | "center" | "end"; fontSize: number; lineHeight: number };
export type TextInputProps = {
  name: string;
  label: string;
  unit?: string;
  inputType: "text" | "textarea";
  labelPosition: "top" | "bottom" | "left" | "right";
  defaultValue: string;
  fontSize: number;
  lineHeight: number;
  placeholder?: string;
  rows?: number;
};
export type ContentProps = { paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number };
export type Components = {
  Content: ContentProps;
  Text: TextProps;
  TextInput: TextInputProps;
  Divider: { thickness: number };
  Spacer: { height: number };
  Grid: { content?: never };
  GridItem: { columns: number; rows: number };
};

export const DEFAULT_PAGE_PROPS: ContentProps = { paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12 };

/** One A4 portrait sheet. Add several pages to the document for more room. */
function Content({ paddingTop, paddingRight, paddingBottom, paddingLeft }: ContentProps) {
  return (
    <section className="a4-page" style={{ padding: `${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm` }}>
      <DropZone zone="content" disallow={["Content"]} />
    </section>
  );
}

const weightOf = { normal: 400, semibold: 600, bold: 700 } as const;

/** Layout of a TextInput: label next to / above / below the control. Shared by editor, form and result. */
export function FieldFrame({ label, labelPosition, fontSize, lineHeight, children }: Pick<TextInputProps, "label" | "labelPosition" | "fontSize" | "lineHeight"> & { children: React.ReactNode }) {
  const horizontal = labelPosition === "left" || labelPosition === "right";
  const labelFirst = labelPosition === "top" || labelPosition === "left";
  const labelEl = label ? <span style={{ fontSize, lineHeight }}>{label}</span> : null;
  const style: CSSProperties = { display: "flex", flexDirection: horizontal ? "row" : "column", alignItems: horizontal ? "center" : "stretch", gap: 4, minWidth: 0 };
  return (
    <div style={style}>
      {labelFirst && labelEl}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {!labelFirst && labelEl}
    </div>
  );
}

export const textInputFields = {
  name: { type: "text", label: "Field name (unique)" },
  label: { type: "text", label: "Label" },
  unit: { type: "text", label: "Unit" },
  inputType: { type: "select", label: "Input type", options: [{ label: "Text", value: "text" }, { label: "Text area", value: "textarea" }] },
  labelPosition: { type: "select", label: "Label position", options: [{ label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }, { label: "Left", value: "left" }, { label: "Right", value: "right" }] },
  defaultValue: { type: "text", label: "Default value" },
  fontSize: { type: "number", label: "Font size", min: 8, max: 72 },
  lineHeight: { type: "number", label: "Line height", min: 1, max: 3, step: 0.1 },
  placeholder: { type: "text", label: "Placeholder" },
  rows: { type: "number", label: "Rows", min: 2, max: 20 },
} as const;

/** Base config = the editor. The fill form and the result swap `TextInput.render` (see form.tsx / result.tsx). */
export const config: Config<Components> = {
  root: { render: ({ children }) => <main className="template-pages">{children}</main> },
  components: {
    Content: {
      label: "Page (A4)",
      fields: {
        paddingTop: { type: "number", label: "Top padding (mm)" },
        paddingRight: { type: "number", label: "Right padding (mm)" },
        paddingBottom: { type: "number", label: "Bottom padding (mm)" },
        paddingLeft: { type: "number", label: "Left padding (mm)" },
      },
      defaultProps: DEFAULT_PAGE_PROPS,
      render: Content,
    },
    Text: {
      label: "Text",
      fields: {
        text: { type: "textarea", label: "Text (use {{tenantNames}}, {{rent}} … for lease details)" },
        weight: { type: "select", label: "Weight", options: [{ label: "Normal", value: "normal" }, { label: "Semibold", value: "semibold" }, { label: "Bold", value: "bold" }] },
        align: { type: "select", label: "Align", options: [{ label: "Start", value: "start" }, { label: "Center", value: "center" }, { label: "End", value: "end" }] },
        fontSize: { type: "number", label: "Font size", min: 8, max: 96 },
        lineHeight: { type: "number", label: "Line height", min: 0.8, max: 3, step: 0.1 },
      },
      defaultProps: { text: "Text", weight: "normal", align: "start", fontSize: 14, lineHeight: 1.5 },
      render: function TextBlock({ text, weight, align, fontSize, lineHeight }) {
        const fill = useFill();
        return <p style={{ margin: 0, whiteSpace: "pre-wrap", fontWeight: weightOf[weight], textAlign: align, fontSize, lineHeight }}>{fill(text)}</p>;
      },
    },
    TextInput: {
      label: "Text input (form field)",
      fields: textInputFields,
      defaultProps: { name: "field", label: "Label", unit: "", inputType: "text", labelPosition: "top", defaultValue: "", fontSize: 14, lineHeight: 1.5, placeholder: "", rows: 4 },
      // editor preview: an empty box, so it is clear this becomes an input on the lease
      render: ({ name, label, unit, labelPosition, fontSize, lineHeight, inputType, rows = 4 }) => (
        <FieldFrame label={label} labelPosition={labelPosition} fontSize={fontSize} lineHeight={lineHeight}>
          <div style={{ border: "1px dashed #9ca3af", borderRadius: 4, padding: "4px 8px", minHeight: inputType === "textarea" ? rows * 20 : 28, fontSize: 12, color: "#6b7280" }}>
            [{name}]{unit ? ` ${unit}` : ""}
          </div>
        </FieldFrame>
      ),
    },
    Grid: {
      fields: {},
      render: () => <DropZone zone="grid" allow={["GridItem"]} style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gridAutoRows: "minmax(40px, auto)", gap: 8, width: "100%", minHeight: 100 }} />,
    },
    GridItem: {
      inline: true,
      fields: { columns: { type: "number", label: "Columns", min: 1, max: 12 }, rows: { type: "number", label: "Rows", min: 1, max: 20 } },
      defaultProps: { columns: 6, rows: 1 },
      render: ({ columns, rows, puck }) => <DropZone ref={puck.dragRef} zone="content" disallow={["GridItem"]} style={{ gridColumn: `span ${columns}`, gridRow: `span ${rows}`, minWidth: 0, minHeight: 40 }} minEmptyHeight="40px" />,
    },
    Divider: {
      fields: { thickness: { type: "number", label: "Thickness" } },
      defaultProps: { thickness: 1 },
      render: ({ thickness }) => <hr style={{ border: 0, borderTop: `${thickness}px solid currentColor` }} />,
    },
    Spacer: {
      fields: { height: { type: "number", label: "Height" } },
      defaultProps: { height: 16 },
      render: ({ height }) => <div style={{ height }} />,
    },
  },
};

export type TemplatePage = Data<Components>;
/** What the API stores per version: one or more A4 pages (legacy single-page data is accepted too). */
export type AgreementDocument = { pages: TemplatePage[] };

export const emptyPage = (): TemplatePage => ({ content: [{ type: "Content", props: { id: `page-${crypto.randomUUID().slice(0, 8)}`, ...DEFAULT_PAGE_PROPS } }], root: { props: {} }, zones: {} }) as TemplatePage;

export function toPages(data: unknown): TemplatePage[] {
  const d = data as { pages?: TemplatePage[] } | null;
  if (d && Array.isArray(d.pages)) return d.pages.length > 0 ? d.pages : [emptyPage()];
  return d ? [d as unknown as TemplatePage] : [emptyPage()];
}

const text = (id: string, props: Partial<TextProps>) => ({ type: "Text", props: { id, text: "", weight: "normal", align: "start", fontSize: 14, lineHeight: 1.5, ...props } });
const field = (id: string, props: Partial<TextInputProps>) => ({ type: "TextInput", props: { id, name: "", label: "", unit: "", inputType: "text", labelPosition: "left", defaultValue: "", fontSize: 14, lineHeight: 1.5, placeholder: "", rows: 4, ...props } });
const spacer = (id: string) => ({ type: "Spacer", props: { id, height: 12 } });

/** What a new template starts with: a lease with built-in placeholders and two form fields. */
export const starterDocument = (): AgreementDocument => ({
  pages: [
    {
      content: [{ type: "Content", props: { id: "page-1", ...DEFAULT_PAGE_PROPS } }],
      root: { props: {} },
      zones: {
        "page-1:content": [
          text("t1", { text: "RESIDENTIAL LEASE AGREEMENT", weight: "bold", align: "center", fontSize: 20 }),
          spacer("s1"),
          text("t2", { text: "Made on {{today}} between the landlord of {{propertyName}} and {{tenantNames}} (the tenant)." }),
          spacer("s2"),
          text("t3", { text: "Article 1. Premises and term", weight: "semibold" }),
          text("t4", { text: "The landlord leases unit {{unitName}} of {{propertyName}} to the tenant from {{startDate}} to {{endDate}}." }),
          spacer("s3"),
          text("t5", { text: "Article 2. Rent and deposit", weight: "semibold" }),
          text("t6", { text: "Monthly rent is {{rent}}, billed on {{billingDay}}. The tenant pays a deposit of {{deposit}}, refundable at the end of the lease after deductions for damages and unpaid bills." }),
          spacer("s4"),
          field("f1", { name: "tenantIdNumber", label: "Tenant ID number:" }),
          field("f2", { name: "notes", label: "Additional terms", inputType: "textarea", labelPosition: "top" }),
        ],
      },
    } as TemplatePage,
  ],
});
