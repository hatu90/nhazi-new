"use client";

import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import type { LucideIcon } from "lucide-react";

export interface RowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onClick: () => void;
}

/** Overflow (⋯) menu for a table row: one entry per action, destructive ones in red. Renders nothing when empty. */
export function RowActions({ actions, label = "More actions" }: { actions: (RowAction | false | null | undefined)[]; label?: string }) {
  const items = actions.filter((a): a is RowAction => !!a);
  if (items.length === 0) return null;
  return (
    <MoreMenu
      label={label}
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
