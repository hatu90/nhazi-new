"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "./api";

/** Human message for any thrown value. Client-side failures are translated; the API's own messages are shown as sent. */
export function useErrorMessage() {
  const t = useTranslations("Errors");
  return (err: unknown) => {
    if (err instanceof ApiError && err.code === "NETWORK") return t("network");
    if (err instanceof ApiError && err.code === "STALE_VERSION") return t("staleVersion");
    return err instanceof Error && err.message ? err.message : t("generic");
  };
}
