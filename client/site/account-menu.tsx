"use client";

import { useAuth } from "@/client/auth/auth-provider";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { useTranslations } from "next-intl";

/** Header account control of the public site: the avatar menu when signed in, otherwise the Sign in button. */
export function AccountMenu() {
  const t = useTranslations("Common");
  const { state, signOut } = useAuth();
  if (state.status !== "ready") return <Button variant="primary" label={t("signIn")} href="/auth" isLoading={state.status === "loading"} />;
  const { displayName } = state.me;
  return (
    <DropdownMenu
      items={[
        { id: "dashboard", label: t("dashboard"), onClick: () => window.location.assign("/dashboard") },
        { type: "divider" as const },
        { id: "signout", label: t("signOut"), onClick: () => void signOut().then(() => window.location.assign("/")) },
      ]}
      placement="below"
      alignment="end"
      header={<span className="block px-3 py-2 text-sm">{displayName}</span>}
      renderTrigger={(props) => (
        <button type="button" {...props} aria-label={t("accountMenu")} className="cursor-pointer rounded-full p-1 sm:p-0">
          <Avatar name={displayName} size="md" />
        </button>
      )}
    />
  );
}
