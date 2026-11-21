"use client";

import { NotFound } from "@/client/spa/not-found";
import { useTranslations } from "next-intl";
import { SpaProviders } from "@/client/spa/providers";
import { RequireAccount } from "@/client/spa/require-account";
import { BrowserRouter, Route, Routes } from "react-router";
import { AdminLayout } from "./admin-layout";
import { AgreementEditorPage } from "./pages/agreement-editor";
import { AgreementsPage } from "./pages/agreements";
import { InventoryPage } from "./pages/inventory";
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
import { SettingsPage } from "./pages/settings";
import { TeamPage } from "./pages/team";
import { UnitsPage } from "./pages/units";
import { PropertyLayout } from "./property-layout";
import { ToDashboard } from "./to-dashboard";

export default function AdminApp() {
  const t = useTranslations("Common");
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
                <Route path="inventory" element={<InventoryPage />} />
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
              <Route path="*" element={<NotFound backTo="/" label={t("backToDashboard")} />} />
            </Route>
          </Routes>
        </RequireAccount>
      </SpaProviders>
    </BrowserRouter>
  );
}
