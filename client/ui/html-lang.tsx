"use client";

import { useEffect } from "react";

/** The root <html> is static (cacheComponents), so sync its lang attribute on the client. */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}
