"use client";

import { useMe } from "@/client/auth/auth-provider";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu, type DropdownMenuOption } from "@astryxdesign/core/DropdownMenu";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAccountActions } from "./use-account-actions";

export function UserMenu() {
  const t = useTranslations("Common");
  const me = useMe();
  const { goDashboard, goSettings, logOut } = useAccountActions();
  const items: DropdownMenuOption[] = [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard, onClick: goDashboard },
    ...(goSettings ? [{ id: "settings", label: t("settings"), icon: Settings, onClick: goSettings }] : []),
    { type: "divider" as const },
    { id: "signout", label: t("signOut"), icon: LogOut, onClick: logOut },
  ];
  return (
    <DropdownMenu
      items={items}
      placement="below"
      alignment="end"
      header={<span className="block px-3 py-2 text-sm">{me.displayName}</span>}
      renderTrigger={(props) => (
        <button type="button" {...props} aria-label={t("accountMenu")} className="cursor-pointer rounded-full">
          <Avatar name={me.displayName} size="sm" />
        </button>
      )}
    />
  );
}
