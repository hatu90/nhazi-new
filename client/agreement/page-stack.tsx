"use client";

import { Render, type Config } from "@puckeditor/core";
import { toPages } from "./config";
import type { Components } from "./types";

/** Every template page as its own A4 sheet. */
export function PageStack({ config: cfg, pages }: { config: Config<Components>; pages: ReturnType<typeof toPages> }) {
  return (
    <div className="document-pages">
      {pages.map((page, i) => (
        <div className="document-page" key={i}>
          <Render config={cfg} data={page} />
        </div>
      ))}
    </div>
  );
}
