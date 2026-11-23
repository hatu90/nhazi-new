"use client";

import { type CSSProperties } from "react";
import "./document.css";
import type { DateInputProps } from "./types";

/** Layout of a TextInput: label next to / above / below the control. Shared by editor, form and result. */
export function FieldFrame({ label, labelPosition, fontSize, lineHeight, children }: Pick<DateInputProps, "label" | "labelPosition" | "fontSize" | "lineHeight"> & { children: React.ReactNode }) {
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
