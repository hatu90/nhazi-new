"use client";

import { useFill } from "./fill-context";
import type { TextProps } from "./types";

const weightOf = { normal: 400, semibold: 600, bold: 700 } as const;

export function TextBlock({ text, weight, align, fontSize, lineHeight }: TextProps) {
  const fill = useFill();
  return <p style={{ margin: 0, whiteSpace: "pre-wrap", fontWeight: weightOf[weight], textAlign: align, fontSize, lineHeight }}>{fill(text)}</p>;
}
