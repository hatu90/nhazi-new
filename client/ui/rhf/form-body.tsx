"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import type { ReactNode } from "react";
import { ModalBody } from "../modal-body";
import { FormError } from "../form";

/**
 * The <form> element for a dialog: fields scroll in the body, the error and the Save / Cancel buttons are pinned in the
 * footer (via <ModalBody>). Must be rendered inside <Modal>.
 */
export function FormBody({ onSubmit, children, error, busy, submitLabel, onCancel, inline }: {
  onSubmit: () => void;
  children: ReactNode;
  error?: unknown;
  busy?: boolean;
  submitLabel: string;
  onCancel: () => void;
  /** On a page instead of in a modal: plain fields and a Save button, no footer, no Cancel. */
  inline?: boolean;
}) {
  if (inline) {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <VStack gap={4}>
          {children}
          <FormError error={error} />
          <HStack justify="start"><Button type="submit" label={submitLabel} isLoading={busy} /></HStack>
        </VStack>
      </form>
    );
  }
  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <ModalBody
        footer={
          <VStack gap={3}>
            <FormError error={error} />
            <HStack gap={2} justify="end">
              <Button label="Cancel" variant="secondary" onClick={onCancel} />
              <Button type="submit" label={submitLabel} isLoading={busy} />
            </HStack>
          </VStack>
        }
      >
        <VStack gap={4}>{children}</VStack>
      </ModalBody>
    </form>
  );
}
