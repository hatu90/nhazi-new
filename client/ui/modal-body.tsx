"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { useContext, type ReactNode } from "react";
import { ModalContext } from "./modal-context";

/**
 * Dialog content on Astryx's Layout: the title bar and the footer (`footer`, e.g. form buttons) stay pinned and only the
 * body scrolls, on phones (fullscreen) and on desktop (capped height) alike.
 */
export function ModalBody({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const modal = useContext(ModalContext);
  if (!modal) throw new Error("ModalBody must be rendered inside <Modal>");
  return (
    <Layout
      height="fill"
      padding={5}
      header={<DialogHeader title={modal.title} onOpenChange={(o) => !o && modal.onClose()} />}
      content={<LayoutContent isScrollable>
        <div className="py-4">
          {children}
        </div>
      </LayoutContent>}
      footer={footer && <LayoutFooter>{footer}</LayoutFooter>}
    />
  );
}
