"use client";

import { HStack } from "@astryxdesign/core/Stack";
import type { ReactNode } from "react";

/** Small helper for the common "label + button row" at the bottom of a form. */
export const FormActions = ({ children }: { children: ReactNode }) => <HStack gap={2}>{children}</HStack>;
