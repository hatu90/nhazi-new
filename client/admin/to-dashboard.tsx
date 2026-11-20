"use client";

import { PageSpinner } from "@/client/ui";
import { useEffect } from "react";

/** The property list lives on the dashboard; /admin itself only hosts per-property pages. */
export function ToDashboard() {
  useEffect(() => { window.location.replace("/dashboard"); }, []);
  return <PageSpinner />;
}
