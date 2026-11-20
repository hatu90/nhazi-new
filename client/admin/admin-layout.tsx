"use client";

import { SpaShell } from "@/client/spa/topbar";
import { Outlet } from "react-router";
import { PropertySidebar } from "./property-sidebar";

export function AdminLayout() {
  return (
    <SpaShell sideNav={(withAccount) => <PropertySidebar withAccount={withAccount} />}>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Outlet />
      </div>
    </SpaShell>
  );
}
