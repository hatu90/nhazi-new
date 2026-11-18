"use client";

import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { useLocation, useNavigate, useParams } from "react-router";
import { AccountSection } from "@/client/spa/topbar";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse } from "@/client/lib/types";

const items = [
  { id: "", label: "Overview" },
  { id: "units", label: "Units" },
  { id: "leases", label: "Leases" },
  { id: "services", label: "Services" },
  { id: "meters", label: "Meters" },
  { id: "requests", label: "Requests" },
  { id: "invoices", label: "Invoices" },
  { id: "agreements", label: "Agreements" },
  { id: "settings", label: "Settings" },
];

/** Sidebar for /admin/properties/:propertyId/*: the current property's sections, then a switcher for the others. */
export function PropertySidebar({ withAccount = false }: { withAccount?: boolean }) {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const section = useLocation().pathname.split("/")[3] ?? "";
  const list = useGet<IAdminPropertyListResponse>("/api/admin/properties", { pageSize: 50 });
  if (!propertyId) return null;
  const all = list.data?.items ?? [];
  const current = all.find((p) => p.id === propertyId);
  const others = all.filter((p) => p.id !== propertyId);

  return (
    <SideNav>
      <SideNavSection title={current?.name ?? "Property"}>
        {items.map((i) => (
          <SideNavItem key={i.id} label={i.label} isSelected={section === i.id} onClick={() => navigate(`/properties/${propertyId}${i.id ? `/${i.id}` : ""}`)} />
        ))}
      </SideNavSection>
      {others.length > 0 && (
        <SideNavSection title="Other properties">
          {others.map((p) => (
            <SideNavItem key={p.id} label={p.name} onClick={() => navigate(`/properties/${p.id}`)} />
          ))}
        </SideNavSection>
      )}
      {withAccount && <AccountSection />}
    </SideNav>
  );
}
