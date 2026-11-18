import type { Metadata } from "next";
import { DashboardLoader } from "@/client/dashboard/loader";

export const metadata: Metadata = { title: "My leases", robots: { index: false } };

/** One page for every /dashboard/* URL: the SPA (react-router, basename /dashboard) owns routing from here. */
export default function DashboardPage() {
  return <DashboardLoader />;
}
