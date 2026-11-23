"use client";

import { createContext, useContext } from "react";
import "./document.css";
import { fillText } from "./vars";

/** Values for {{placeholders}} in Text blocks. Empty in the editor, which shows the raw {{keys}}. */
export const AgreementVars = createContext<Record<string, string>>({});

/** API base of the lease whose files a form can upload to / show (`<base>/uploads`, `<base>/files`); null = no uploads. */
export const AgreementFiles = createContext<string | null>(null);
export const useFilesBase = () => useContext(AgreementFiles);

export const useFill = () => {
  const vars = useContext(AgreementVars);
  return (text: string) => fillText(text, vars);
};
