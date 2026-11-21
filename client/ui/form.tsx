"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { ApiError } from "@/client/lib/api";
import { useErrorMessage } from "@/client/lib/use-error-message";

/** Server-side validation message for one field (`details.fieldErrors`), if the failed request had one. */
export const fieldError = (err: unknown, name: string): string | undefined => (err instanceof ApiError ? err.fieldErrors[name]?.[0] : undefined);

/** Whole-form error. Field-level 422s also show on their fields; here they are listed so none is ever hidden. */
export function FormError({ error }: { error: unknown }) {
  const message = useErrorMessage();
  if (!error) return null;
  const fields = error instanceof ApiError ? Object.entries(error.fieldErrors) : [];
  return <Banner status="error" title={fields.length > 0 ? fields.map(([k, v]) => `${k}: ${v[0]}`).join(" · ") : message(error)} />;
}

/** "", "12" -> number | undefined for optional numeric inputs. */
export const num = (v: string): number | undefined => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
export const text = (v: string): string | undefined => (v.trim() === "" ? undefined : v.trim());
