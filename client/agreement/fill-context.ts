"use client";

import { createContext, useContext } from "react";
import "./document.css";
import { fillText } from "./vars";

/** Values for {{placeholders}} in Text blocks. Empty in the editor, which shows the raw {{keys}}. */
export const AgreementVars = createContext<Record<string, string>>({});

export const useFill = () => {
  const vars = useContext(AgreementVars);
  return (text: string) => fillText(text, vars);
};
