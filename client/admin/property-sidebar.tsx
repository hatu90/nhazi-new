"use client";

import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Building2, ClipboardList, FileSignature, FileText, Gauge, LayoutDashboard, Package, Receipt, Settings, Wrench, DoorOpen, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { AccountSection } from "@/client/spa/account-section";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse } from "@/client/lib/types";

const items: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "", label: "Overview", icon: LayoutDashboard },
  { id: "units", label: "Units", icon: DoorOpen },
  { id: "leases", label: "Leases", icon: FileSignature },
  { id: "services", label: "Services", icon: Wrench },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "meters", label: "Meters", icon: Gauge },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "agreements", label: "Agreements", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
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
          <SideNavItem key={i.id} label={i.label} icon={i.icon} isSelected={section === i.id} onClick={() => navigate(`/properties/${propertyId}${i.id ? `/${i.id}` : ""}`)} />
        ))}
      </SideNavSection>
      {others.length > 0 && (
        <SideNavSection title="Other properties">
          {others.map((p) => (
            <SideNavItem key={p.id} label={p.name} icon={Building2} onClick={() => navigate(`/properties/${p.id}`)} />
          ))}
        </SideNavSection>
      )}
      {withAccount && <AccountSection />}
    </SideNav>
  );
}
