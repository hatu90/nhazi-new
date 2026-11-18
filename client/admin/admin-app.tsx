"use client";

import { useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { PageSpinner } from "@/client/ui";
import { NotFound } from "@/client/spa/not-found";
import { SpaProviders } from "@/client/spa/providers";
import { RequireAccount } from "@/client/spa/require-account";
import { SpaShell } from "@/client/spa/topbar";
import { AgreementEditorPage } from "./pages/agreement-editor";
import { AgreementsPage } from "./pages/agreements";
import { InvoiceDetailPage } from "./pages/invoice-detail";
import { InvoicesPage } from "./pages/invoices";
import { LeaseDetailPage } from "./pages/lease-detail";
import { LeasesPage } from "./pages/leases";
import { MeterPage } from "./pages/meter";
import { MetersPage } from "./pages/meters";
import { OverviewPage } from "./pages/overview";
import { RequestDetailPage } from "./pages/request-detail";
import { RequestsPage } from "./pages/requests";
import { ServicesPage } from "./pages/services";
import { TeamPage } from "./pages/team";
import { UnitsPage } from "./pages/units";
import { PropertySidebar } from "./property-sidebar";
import { SettingsPage } from "./pages/settings";
import { PropertyLayout } from "./property-layout";

/** The property list lives on the dashboard; /admin itself only hosts per-property pages. */
function ToDashboard() {
  useEffect(() => { window.location.replace("/dashboard"); }, []);
  return <PageSpinner />;
}

function AdminLayout() {
  return (
    <SpaShell sideNav={(withAccount) => <PropertySidebar withAccount={withAccount} />}>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Outlet />
      </div>
    </SpaShell>
  );
}

export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin">
      <SpaProviders>
        <RequireAccount>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<ToDashboard />} />
              <Route path="properties/:propertyId" element={<PropertyLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="units" element={<UnitsPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="meters" element={<MetersPage />} />
                <Route path="meters/:meterId" element={<MeterPage />} />
                <Route path="leases" element={<LeasesPage />} />
                <Route path="leases/:leaseId" element={<LeaseDetailPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:requestId" element={<RequestDetailPage />} />
                <Route path="agreements" element={<AgreementsPage />} />
                <Route path="agreements/:templateId" element={<AgreementEditorPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound backTo="/" label="Back to dashboard" />} />
            </Route>
          </Routes>
        </RequireAccount>
      </SpaProviders>
    </BrowserRouter>
  );
}
