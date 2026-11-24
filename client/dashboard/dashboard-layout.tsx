"use client";

import { SpaShell } from "@/client/spa/topbar";
import { Outlet } from "react-router";

export function DashboardLayout() {
  return (
    <SpaShell>
      <div className="mx-auto w-full max-w-4xl flex-1 min-w-0 px-2 py-4 sm:px-5 sm:py-8">
        <Outlet />
      </div>
    </SpaShell>
  );
}
