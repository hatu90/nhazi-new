"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/client/ui";

const DashboardApp = dynamic(() => import("./dashboard-app"), { ssr: false, loading: () => <PageSkeleton frame="narrow" /> });

export const DashboardLoader = () => <DashboardApp />;
