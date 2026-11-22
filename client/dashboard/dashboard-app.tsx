"use client";

import { NotFound } from "@/client/spa/not-found";
import { useTranslations } from "next-intl";
import { SpaProviders } from "@/client/spa/providers";
import { RequireAccount } from "@/client/spa/require-account";
import { BrowserRouter, Route, Routes } from "react-router";
import { DashboardLayout } from "./dashboard-layout";
import { LeaseLayout } from "./lease-layout";
import { AgreementPage } from "./pages/agreement";
import { HomePage } from "./pages/home";
import { InvoiceDetailPage } from "./pages/invoice-detail";
import { InvoicesPage } from "./pages/invoices";
import { LeaseOverviewPage } from "./pages/lease-overview";
import { NotificationsPage } from "./pages/notifications";
import { RequestDetailPage } from "./pages/request-detail";
import { RequestsPage } from "./pages/requests";

export default function DashboardApp() {
  const t = useTranslations("Dashboard");
  return (
    <BrowserRouter basename="/dashboard">
      <SpaProviders>
        <RequireAccount>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route index element={<HomePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="leases/:leaseId" element={<LeaseLayout />}>
                <Route index element={<LeaseOverviewPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:requestId" element={<RequestDetailPage />} />
                <Route path="agreement" element={<AgreementPage />} />
              </Route>
              <Route path="*" element={<NotFound backTo="/" label={t("backToLeases")} />} />
            </Route>
          </Routes>
        </RequireAccount>
      </SpaProviders>
    </BrowserRouter>
  );
}
