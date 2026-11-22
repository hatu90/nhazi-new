"use client";

import { Logo } from "@/client/ui/logo";
import { AppShell } from "@astryxdesign/core/AppShell";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";
import { NotificationBell } from "@/client/notifications/notification-bell";
import { PlainAnchor } from "./plain-anchor";
import { UserMenu } from "./user-menu";

/** Responsive frame shared by both SPAs. */
export function SpaShell({
  sideNav,
  children,
}: {
  /** Render the sidebar; `withAccount` is true inside the mobile drawer, where the avatar menu is hidden. */
  sideNav?: (withAccount: boolean) => ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <AppShell
      height="auto"
      variant="section"
      sideNav={sideNav?.(false)}
      mobileNav={sideNav ? { content: <MobileNav label={t("menu")}>{sideNav(true)}</MobileNav> } : undefined}
      topNav={
        <TopNav
          label={t("mainNav")}
          heading={<TopNavHeading logo={<Logo size={28} />} heading="Nhazi" headingHref="/dashboard" as={PlainAnchor} />}
          endContent={
            // With a drawer, the account lives inside it on mobile.
            <span className="inline-flex items-center gap-2">
              <NotificationBell />
              <span className={`items-center gap-3 ${sideNav ? "hidden md:inline-flex" : "inline-flex"}`}><UserMenu /></span>
            </span>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
