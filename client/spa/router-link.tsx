"use client";

import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link } from "react-router";

/** Astryx links (Button href, Link, Tab…) navigate inside the SPA instead of reloading the page. */
export const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }>(function RouterLink({ href = "#", ...rest }, ref) {
  return <Link ref={ref} to={href} {...rest} />;
});
