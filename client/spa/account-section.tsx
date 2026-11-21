"use client";

import { useMe } from "@/client/auth/auth-provider";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { useTranslations } from "next-intl";
import { useAccountActions } from "./use-account-actions";

/** "Account" block for the mobile drawer; the avatar menu is hidden there. */
export function AccountSection() {
  const t = useTranslations("Common");
  const me = useMe();
  const { goDashboard, goSettings, logOut } = useAccountActions();
  return (
    <SideNavSection title={me.displayName}>
      <SideNavItem label={t("dashboard")} onClick={goDashboard} />
      {goSettings && <SideNavItem label={t("settings")} onClick={goSettings} />}
      <SideNavItem label={t("signOut")} onClick={logOut} />
    </SideNavSection>
  );
}
