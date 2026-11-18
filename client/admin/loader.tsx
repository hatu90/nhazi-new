"use client";

import dynamic from "next/dynamic";
import { PageSpinner } from "@/client/ui";

// The router needs `window`, so the SPA is client-only (no SSR); the server just ships this shell.
const AdminApp = dynamic(() => import("./admin-app"), { ssr: false, loading: () => <PageSpinner /> });

export const AdminLoader = () => <AdminApp />;
