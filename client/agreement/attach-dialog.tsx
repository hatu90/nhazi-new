"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useErrorMessage } from "@/client/lib/use-error-message";
import { Modal, SelectField } from "@/client/ui";
import { FormFooter } from "@/client/ui/rhf";

/** Dialog to add an agreement to a lease from one of the property's templates. `templates` is undefined while loading. */
export function AttachAgreementDialog({ open, templates, onSave, onClose }: {
  open: boolean;
  templates: { id: string; name: string }[] | undefined;
  onSave: (templateId: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useTranslations("Documents");
  const c = useTranslations("Common");
  const message = useErrorMessage();
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setTemplateId(""); setError(null); onClose(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(templateId);
      close();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={close}>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
        <Layout
          height="fill"
          padding={5}
          header={<DialogHeader title={t("addAgreement")} onOpenChange={(o) => { if (!o) close(); }} />}
          content={
            <LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <VStack gap={3}>
                {templates && templates.length === 0 ? (
                  <Text color="secondary">{t("noTemplates")}</Text>
                ) : (
                  <SelectField label={t("pickTemplate")} value={templateId} onChange={setTemplateId} options={(templates ?? []).map((x) => ({ value: x.id, label: x.name }))} />
                )}
              </VStack>
            </LayoutContent>
          }
          footer={<LayoutFooter padding={5}><FormFooter error={error} busy={busy} submitLabel={c("add")} submitDisabled={!templateId} onCancel={close} /></LayoutFooter>}
        />
      </form>
    </Modal>
  );
}
