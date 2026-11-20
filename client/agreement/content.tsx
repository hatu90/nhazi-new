"use client";

import { DropZone } from "@puckeditor/core";
import "./document.css";
import type { ContentProps } from "./types";

/** One A4 portrait sheet. Add several pages to the document for more room. */
export function Content({ paddingTop, paddingRight, paddingBottom, paddingLeft }: ContentProps) {
  return (
    <section className="a4-page" style={{ padding: `${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm` }}>
      <DropZone zone="content" disallow={["Content"]} />
    </section>
  );
}
