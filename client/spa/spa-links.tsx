"use client";

import { LinkProvider } from "@astryxdesign/core/Link";
import { type ReactNode } from "react";
import { RouterLink } from "./router-link";

export const SpaLinks = ({ children }: { children: ReactNode }) => <LinkProvider component={RouterLink}>{children}</LinkProvider>;
