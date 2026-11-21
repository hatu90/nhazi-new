import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "./globals.css";
import { IntlProvider } from "@/client/ui/intl-provider";
import { ThemeRoot } from "@/client/ui/theme-root";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: { default: t("appTitle"), template: "%s · Nhazi" }, description: t("appDescription") };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#357d9d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
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
