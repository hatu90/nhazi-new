"use client";

import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";

export const Tag = ({ label, tone = "neutral" }: { label: string; tone?: BadgeVariant }) => <Badge variant={tone} label={label} />;
