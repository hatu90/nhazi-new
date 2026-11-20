"use client";

import { Card } from "@astryxdesign/core/Card";
import type { ReactNode } from "react";
import { Raised } from "./raised";

export function MobileRow({ nested, children }: { nested: boolean; children: ReactNode }) {
  return nested ? <Raised>{children}</Raised> : <Card padding={3}>{children}</Card>;
}
