import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: { default: "Nhazi — rental management", template: "%s · Nhazi" },
  description: "Manage properties, leases, utilities and invoices — and give your tenants one place to see it all.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

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
