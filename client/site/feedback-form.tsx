"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/client/auth/auth-provider";
import { api } from "@/client/lib/api";
import { Modal, useIsMobile } from "@/client/ui";
import { FArea, FSelect, FText, FormFooter, applyServerErrors, useOpenReset } from "@/client/ui/rhf";
import { FEEDBACK_CATEGORIES } from "./feedback-categories";

interface Values {
  authorName: string;
  contact: string;
  category: string;
  message: string;
}

/** "Leave feedback" button + modal. Returns a fragment (button, then the success banner on its own line) so the page can lay it out in its header row.
 * Anyone can send feedback, signed in or not; a signed-in visitor's name and phone are filled in. */
export function FeedbackForm() {
  const t = useTranslations("Feedbacks");
  const e = useTranslations("Enums");
  const router = useRouter();
  const mobile = useIsMobile();
  const { state } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);

  const defaults: Values = {
    authorName: state.status === "ready" ? state.me.displayName : "",
    contact: state.status === "ready" ? state.me.phoneNumber : "",
    category: "",
    message: "",
  };
  const form = useForm<Values>({ defaultValues: defaults });
  useOpenReset(open, () => { form.reset(defaults); setError(null); });

  const close = () => setOpen(false);
  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await api("/api/public/feedbacks", { method: "POST", anonymous: true, body: values });
      setSent(true);
      close();
      router.refresh();
    } catch (err) {
      setError(err);
      applyServerErrors(form, err);
    }
  });

  return (
    <>
      <div className="w-full shrink-0 sm:w-auto">
        <Button variant="primary" label={t("formTitle")} width={mobile ? "100%" : undefined} onClick={() => { setSent(false); setOpen(true); }} />
      </div>
      {sent && <div className="basis-full"><Banner status="success" title={t("sent")} /></div>}
      <Modal open={open} onClose={close}>
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("formTitle")} onOpenChange={(o) => !o && close()} />}
            content={
              <LayoutContent isScrollable style={{ paddingBlock: 16 }}>
                <VStack gap={4}>
                  <FSelect control={form.control} name="category" label={t("category")} required width="100%" options={FEEDBACK_CATEGORIES.map((c) => ({ value: c, label: e(`feedbackCategory.${c}`) }))} />
                  <FText control={form.control} name="authorName" label={t("name")} required width="100%" maxLength={100} />
                  <FText control={form.control} name="contact" label={t("contact")} hint={t("contactHint")} required width="100%" maxLength={200} />
                  <FArea control={form.control} name="message" label={t("message")} required rows={5} width="100%" />
                </VStack>
              </LayoutContent>
            }
            footer={<LayoutFooter padding={5}><FormFooter error={error} busy={form.formState.isSubmitting} submitLabel={t("submit")} onCancel={close} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </>
  );
}
