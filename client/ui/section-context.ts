"use client";

import { createContext, useContext } from "react";

/** True below a Section, whose muted surface means nested blocks should not draw borders of their own. */
const SectionContext = createContext(false);

export const SectionProvider = SectionContext.Provider;
export const useInSection = () => useContext(SectionContext);
