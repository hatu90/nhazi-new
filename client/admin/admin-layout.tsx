"use client";

import { SpaShell } from "@/client/spa/topbar";
import { Outlet } from "react-router";
import { PropertySidebar } from "./property-sidebar";

export function AdminLayout() {
  return (
    <SpaShell sideNav={(withAccount) => <PropertySidebar withAccount={withAccount} />}>
      <div className="mx-auto w-full max-w-6xl flex-1 min-w-0 px-4 py-6 sm:px-5 sm:py-8">
        <Outlet />
      </div>
    </SpaShell>
  );
}
