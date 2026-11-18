"use client";

import dynamic from "next/dynamic";
import { PageSpinner } from "@/client/ui";

const DashboardApp = dynamic(() => import("./dashboard-app"), { ssr: false, loading: () => <PageSpinner /> });

export const DashboardLoader = () => <DashboardApp />;
