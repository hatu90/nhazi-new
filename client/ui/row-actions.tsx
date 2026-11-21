"use client";

import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface RowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onClick: () => void;
}

/** Overflow (⋯) menu for a table row: one entry per action, destructive ones in red. Renders nothing when empty. */
export function RowActions({ actions }: { actions: (RowAction | false | null | undefined)[] }) {
  const t = useTranslations("Common");
  const items = actions.filter((a): a is RowAction => !!a);
  if (items.length === 0) return null;
  return (
    <MoreMenu
      label={t("moreActions")}
      size="sm"
      placement="below"
      alignment="end"
      items={items.map(({ id, label: l, icon: Icon, destructive, onClick }) => ({
        id,
        label: l,
        icon: Icon && <Icon size={16} />,
        variant: destructive ? ("destructive" as const) : undefined,
        onClick,
      }))}
    />
  );
}
