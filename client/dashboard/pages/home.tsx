"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMe } from "@/client/auth/auth-provider";
import { useGet } from "@/client/lib/hooks";
import type { IDashboardResponse } from "@/client/lib/types";
import { NotificationsCard } from "@/client/dashboard/notifications-card";
import { PropertyFields, usePropertyForm } from "@/client/admin/property-form";
import { FormFooter } from "@/client/ui/rhf";
import { DashboardSkeleton, ErrorBox, Modal, PageHeader } from "@/client/ui";
import { ManagementSection } from "./home-management";
import { TenantSection } from "./home-tenant";

/** Home: what the account manages (as a property member) and what it rents (as a tenant). */
export function HomePage() {
  const t = useTranslations("Dashboard");
  const me = useMe();
  const dashboard = useGet<IDashboardResponse>("/api/me/dashboard");
  const [creating, setCreating] = useState(false);
  const propertyForm = usePropertyForm({
    method: "POST", path: "/api/admin/properties", open: creating, onDone: (p) => {
      // Full page load: keep the dialog open until the browser leaves, so it does not flash closed.
      window.location.assign(`/admin/properties/${p.id}`);
    }
  });

  return (
    <VStack gap={5}>
      <PageHeader title={t("title")} subtitle={t("hello", { name: me.displayName })} />
      <NotificationsCard />
      {dashboard.isPending ? <DashboardSkeleton /> : dashboard.error ? <ErrorBox error={dashboard.error} retry={() => void dashboard.refetch()} /> : (
        <>
          <ManagementSection data={dashboard.data.management} onCreate={() => setCreating(true)} />
          <TenantSection data={dashboard.data.tenant} />
        </>
      )}
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={propertyForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("newProperty")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <PropertyFields x={propertyForm} />
            </LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={propertyForm.error} busy={propertyForm.busy} submitLabel={t("createProperty")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
