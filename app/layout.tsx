import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "./globals.css";
import { IntlProvider } from "@/client/ui/intl-provider";
import { ThemeRoot } from "@/client/ui/theme-root";

// Figtree (the Astryx default) has no Vietnamese subset, so stacked diacritics fell back to a system font.
// Be Vietnam Pro is drawn for Vietnamese; the theme's font tokens point at this variable.
const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: { default: t("appTitle"), template: "%s · Nhazi" }, description: t("appDescription") };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#357d9d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodyFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense>
          <IntlProvider>
            <ThemeRoot>{children}</ThemeRoot>
          </IntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
