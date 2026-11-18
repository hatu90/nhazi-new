import type { Metadata } from "next";
import { AdminLoader } from "@/client/admin/loader";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/** One page for every /admin/* URL: the SPA (react-router, basename /admin) owns routing from here. */
export default function AdminPage() {
  return <AdminLoader />;
}
