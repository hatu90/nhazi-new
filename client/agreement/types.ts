"use client";

import { type Data } from "@puckeditor/core";
import "./document.css";

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

export type TemplatePage = Data<Components>;

/** What the API stores per version: one or more A4 pages (legacy single-page data is accepted too). */
export type AgreementDocument = { pages: TemplatePage[] };
