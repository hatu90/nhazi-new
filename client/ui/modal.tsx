"use client";

import { Dialog } from "@astryxdesign/core/Dialog";
import type { ReactNode } from "react";
import { ModalContext } from "./modal-context";
import { useIsMobile } from "./use-is-mobile";

/** Dialog shell. Put a <ModalBody> (or a form's <FormBody>) inside it. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const mobile = useIsMobile();
  return (
    <Dialog isOpen={open} onOpenChange={(o) => !o && onClose()} width={wide ? 760 : 480} maxHeight="85dvh" padding={0} purpose="form" variant={mobile ? "fullscreen" : "standard"}>
      <ModalContext value={{ title, onClose }}>{open ? children : null}</ModalContext>
    </Dialog>
  );
}
