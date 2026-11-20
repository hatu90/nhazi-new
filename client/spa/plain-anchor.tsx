"use client";

import { forwardRef, type AnchorHTMLAttributes } from "react";

/** Full-page link: the logo must leave the current SPA (router links would stay under its basename). */
export const PlainAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function PlainAnchor(props, ref) {
  return <a ref={ref} {...props} />;
});
