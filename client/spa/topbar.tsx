"use client";

import { AppShell } from "@astryxdesign/core/AppShell";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { type ReactNode } from "react";
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
  return (
    <AppShell
      height="auto"
      variant="section"
      sideNav={sideNav?.(false)}
      mobileNav={sideNav ? { content: <MobileNav label="Menu">{sideNav(true)}</MobileNav> } : undefined}
      topNav={
        <TopNav
          label="Main navigation"
          heading={<TopNavHeading heading="Nhazi" headingHref="/dashboard" as={PlainAnchor} />}
          endContent={
            // With a drawer, the account lives inside it on mobile.
            <span className={`items-center gap-3 ${sideNav ? "hidden md:inline-flex" : "inline-flex"}`}><UserMenu /></span>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
