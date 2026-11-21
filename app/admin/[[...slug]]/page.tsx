import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminLoader } from "@/client/admin/loader";


/** One page for every /admin/* URL: the SPA (react-router, basename /admin) owns routing from here. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("admin"), robots: { index: false } };
}

export default function AdminPage() {
  return <AdminLoader />;
}
