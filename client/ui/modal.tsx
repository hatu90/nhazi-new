"use client";

import { Dialog } from "@astryxdesign/core/Dialog";
import type { ReactNode } from "react";
import { useIsMobile } from "./use-is-mobile";

/**
 * Astryx Dialog at its default width. The page writes the content out, so the structure is visible where the modal is used:
 *
 *   <Modal open={open} onClose={close}>
 *     <form noValidate onSubmit={f.submit} className="flex min-h-0 flex-1 flex-col">
 *       <Layout height="fill" padding={5}
 *         header={<DialogHeader title="…" onOpenChange={(o) => !o && close()} />}
 *         content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><XFields x={f} /></LayoutContent>}
 *         footer={<LayoutFooter padding={5}><FormFooter error={f.error} busy={f.busy} submitLabel="Save" onCancel={close} /></LayoutFooter>} />
 *     </form>
 *   </Modal>
 *
 * where `f = useXForm({ open, onDone, … })` lives in the page (see `client/ui/rhf`).
 */
export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const mobile = useIsMobile();
  return (
    <Dialog isOpen={open} onOpenChange={(o) => !o && onClose()} maxHeight="85dvh" padding={0} purpose="form" variant={mobile ? "fullscreen" : "standard"}>
      {open ? children : null}
    </Dialog>
  );
}
