"use client";

import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { defaultThemeSlug, themes } from "@/astryx-themes";

/** Astryx theme + color mode, and Next.js routing for Astryx links (the SPAs swap in react-router's). */
export function ThemeRoot({ children }: { children: ReactNode }) {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </Theme>
  );
}
