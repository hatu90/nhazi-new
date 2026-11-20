"use client";

import { SpaShell } from "@/client/spa/topbar";
import { Outlet } from "react-router";

export function DashboardLayout() {
  return (
    <SpaShell>
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <Outlet />
      </div>
    </SpaShell>
  );
}
