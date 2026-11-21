"use client";

import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  /** Label of the confirming button. */
  actionLabel: string;
  /** Runs when the user confirms; the dialog shows a spinner until it settles, then closes. */
  onConfirm: () => unknown;
}

/**
 * Astryx AlertDialog in place of the browser's `confirm()`. Render `confirm.element` once in the component, then:
 *
 *   const confirm = useConfirm();
 *   <Button onClick={() => confirm.ask({ title: "Delete item?", description: "…", actionLabel: "Delete", onConfirm: () => remove.mutateAsync(id) })} />
 *   {confirm.element}
 */
export function useConfirm() {
  const dialog = useImperativeAlertDialog();
  const ask = ({ onConfirm, ...options }: ConfirmOptions) => {
    const run = async () => {
      try {
        await onConfirm();
      } finally {
        dialog.hide();
      }
    };
    dialog.show({ ...options, onAction: run });
  };
  return { ask, element: dialog.element };
}
