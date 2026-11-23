"use client";

import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import viVN from "@astryxdesign/core/locales/vi-VN.generated.js";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { useLocale } from "next-intl";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { themes } from "@/astryx-themes";

/** Astryx theme + color mode, and Next.js routing for Astryx links (the SPAs swap in react-router's). */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return (
    <InternationalizationProvider locale={locale} messages={{ vi: viVN }}>
      <Theme theme={themes.nhazi}>
        <LinkProvider component={NextLink}>{children}</LinkProvider>
      </Theme>
    </InternationalizationProvider>
  );
}
