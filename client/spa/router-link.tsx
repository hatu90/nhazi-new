"use client";

import { LinkProvider } from "@astryxdesign/core/Link";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";

/** Astryx links (Button href, Link, Tab…) navigate inside the SPA instead of reloading the page. */
const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }>(function RouterLink({ href = "#", ...rest }, ref) {
  return <Link ref={ref} to={href} {...rest} />;
});

export const SpaLinks = ({ children }: { children: ReactNode }) => <LinkProvider component={RouterLink}>{children}</LinkProvider>;
