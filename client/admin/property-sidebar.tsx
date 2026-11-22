"use client";

import { useTranslations } from "next-intl";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Building2, ClipboardList, FileSignature, FileText, Gauge, LayoutDashboard, Package, Receipt, Settings, ShieldCheck, Wrench, DoorOpen } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { AccountSection } from "@/client/spa/account-section";
import { useMe } from "@/client/auth/auth-provider";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse } from "@/client/lib/types";

const items = [
  { id: "", key: "overview", icon: LayoutDashboard },
  { id: "units", key: "units", icon: DoorOpen },
  { id: "leases", key: "leases", icon: FileSignature },
  { id: "services", key: "services", icon: Wrench },
  { id: "inventory", key: "inventory", icon: Package },
  { id: "meters", key: "meters", icon: Gauge },
  { id: "requests", key: "requests", icon: ClipboardList },
  { id: "invoices", key: "invoices", icon: Receipt },
  { id: "agreements", key: "agreements", icon: FileText },
  { id: "verification", key: "verification", icon: ShieldCheck },
  { id: "settings", key: "settings", icon: Settings },
] as const;

/** Sidebar for /admin/properties/:propertyId/*: the current property's sections, then a switcher for the others. */
export function PropertySidebar({ withAccount = false }: { withAccount?: boolean }) {
  const t = useTranslations("AdminNav");
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const { pathname } = useLocation();
  const section = pathname.split("/")[3] ?? "";
  const list = useGet<IAdminPropertyListResponse>("/api/admin/properties", { pageSize: 50 });
  const staff = me.isPlatformAdmin && (
    <SideNavSection title={t("platform")}>
      <SideNavItem label={t("verificationQueue")} icon={ShieldCheck} isSelected={pathname === "/verification"} onClick={() => navigate("/verification")} />
    </SideNavSection>
  );
  if (!propertyId) return staff || withAccount ? <SideNav>{staff}{withAccount && <AccountSection />}</SideNav> : null;
  const all = list.data?.items ?? [];
  const current = all.find((p) => p.id === propertyId);
  const others = all.filter((p) => p.id !== propertyId);

  return (
    <SideNav>
      <SideNavSection title={current?.name ?? t("property")}>
        {items.map((i) => (
          <SideNavItem key={i.id} label={t(i.key)} icon={i.icon} isSelected={section === i.id} onClick={() => navigate(`/properties/${propertyId}${i.id ? `/${i.id}` : ""}`)} />
        ))}
      </SideNavSection>
      {others.length > 0 && (
        <SideNavSection title={t("otherProperties")}>
          {others.map((p) => (
            <SideNavItem key={p.id} label={p.name} icon={Building2} onClick={() => navigate(`/properties/${p.id}`)} />
          ))}
        </SideNavSection>
      )}
      {staff}
      {withAccount && <AccountSection />}
    </SideNav>
  );
}
