import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardLoader } from "@/client/dashboard/loader";


/** One page for every /dashboard/* URL: the SPA (react-router, basename /dashboard) owns routing from here. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("dashboardTitle"), robots: { index: false } };
}

export default function DashboardPage() {
  return <DashboardLoader />;
}
