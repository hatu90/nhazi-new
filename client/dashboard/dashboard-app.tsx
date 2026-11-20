"use client";

import { NotFound } from "@/client/spa/not-found";
import { SpaProviders } from "@/client/spa/providers";
import { RequireAccount } from "@/client/spa/require-account";
import { BrowserRouter, Route, Routes } from "react-router";
import { DashboardLayout } from "./dashboard-layout";
import { LeaseLayout } from "./lease-layout";
import { HomePage } from "./pages/home";
import { InvoiceDetailPage } from "./pages/invoice-detail";
import { InvoicesPage } from "./pages/invoices";
import { LeaseOverviewPage } from "./pages/lease-overview";
import { RequestDetailPage } from "./pages/request-detail";
import { RequestsPage } from "./pages/requests";

export default function DashboardApp() {
  return (
    <BrowserRouter basename="/dashboard">
      <SpaProviders>
        <RequireAccount>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route index element={<HomePage />} />
              <Route path="leases/:leaseId" element={<LeaseLayout />}>
                <Route index element={<LeaseOverviewPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:requestId" element={<RequestDetailPage />} />
              </Route>
              <Route path="*" element={<NotFound backTo="/" label="Back to my leases" />} />
            </Route>
          </Routes>
        </RequireAccount>
      </SpaProviders>
    </BrowserRouter>
  );
}
