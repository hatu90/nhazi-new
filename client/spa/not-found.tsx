"use client";

import { Button } from "@astryxdesign/core/Button";
import { Empty } from "@/client/ui";

export const NotFound = ({ backTo = "/", label = "Back" }: { backTo?: string; label?: string }) => (
  <Empty title="Page not found" hint="This page doesn't exist, or you don't have access to it." action={<Button label={label} variant="secondary" href={backTo} />} />
);
