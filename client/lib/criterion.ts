import { useLocale } from "next-intl";
import type { ICriterionResponse } from "./types";

/** Name / description of a criterion in the current language (English falls back to the Vietnamese original). */
export function useCriterionText() {
  const en = useLocale() === "en";
  return (c: ICriterionResponse) => ({
    name: (en && c.nameEn) || c.name,
    description: (en && c.descriptionEn) || c.description,
  });
}
