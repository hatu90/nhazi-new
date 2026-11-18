"use client";

import { AppShell } from "@astryxdesign/core/AppShell";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useMe } from "@/client/auth/auth-provider";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/client/auth/auth-provider";

/** Full-page link: the logo must leave the current SPA (router links would stay under its basename). */
const PlainAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function PlainAnchor(props, ref) {
  return <a ref={ref} {...props} />;
});

/** Account actions shared by the avatar menu (desktop) and the mobile drawer. */
export function useAccountActions() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { propertyId } = useParams();
  return {
    goDashboard: () => window.location.assign("/dashboard"),
    // Settings are per property; there is no account-level settings page yet.
    goSettings: propertyId ? () => navigate(`/properties/${propertyId}/settings`) : null,
    logOut: () => { void signOut().then(() => window.location.assign("/")); },
  };
}

/** "Account" block for the mobile drawer; the avatar menu is hidden there. */
export function AccountSection() {
  const me = useMe();
  const { goDashboard, goSettings, logOut } = useAccountActions();
  return (
    <SideNavSection title={me.displayName}>
      <SideNavItem label="Dashboard" onClick={goDashboard} />
      {goSettings && <SideNavItem label="Settings" onClick={goSettings} />}
      <SideNavItem label="Sign out" onClick={logOut} />
    </SideNavSection>
  );
}

function UserMenu() {
  const me = useMe();
  const { goDashboard, goSettings, logOut } = useAccountActions();
  const items: DropdownMenuOption[] = [
    { id: "dashboard", label: "Dashboard", onClick: goDashboard },
    ...(goSettings ? [{ id: "settings", label: "Settings", onClick: goSettings }] : []),
    { type: "divider" as const },
    { id: "signout", label: "Sign out", onClick: logOut },
  ];
  return (
    <DropdownMenu
      items={items}
      placement="below"
      alignment="end"
      header={<span className="block px-3 py-2 text-sm">{me.displayName}</span>}
      renderTrigger={(props) => (
        <button type="button" {...props} aria-label="Account menu" className="cursor-pointer rounded-full">
          <Avatar name={me.displayName} size="sm" />
        </button>
      )}
    />
  );
}

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
          heading={<TopNavHeading heading="Handly" headingHref="/dashboard" as={PlainAnchor} />}
          endContent={
            // With a drawer, the account lives inside it on mobile.
            <span className={sideNav ? "hidden md:inline-flex" : "inline-flex"}><UserMenu /></span>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
