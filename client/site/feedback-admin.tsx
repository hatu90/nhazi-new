"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/client/auth/auth-provider";
import { api } from "@/client/lib/api";
import { TextAreaField } from "@/client/ui";
import { FormError } from "@/client/ui/form";

/** Super-admin tools under one feedback: see how to reach the author, write or edit the answer. Renders nothing for everyone else. */
export function FeedbackAdmin({ id, answer }: { id: string; answer: string | null }) {
  const t = useTranslations("Feedbacks");
  const router = useRouter();
  const { state } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer ?? "");
  const [contact, setContact] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (state.status !== "ready" || !state.me.isSuperAdmin) return null;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const showContact = () => run(async () => setContact((await api<{ contact: string }>(`/api/admin/feedbacks/${id}/contact`)).contact));
  const save = () =>
    run(async () => {
      await api(`/api/admin/feedbacks/${id}/answer`, { method: "PUT", body: { answer: draft.trim() } });
      setEditing(false);
      router.refresh();
    });

  return (
    <VStack gap={3}>
      {editing ? (
        <VStack gap={2}>
          <TextAreaField label={t("answer")} value={draft} onChange={setDraft} rows={4} width="100%" required />
          <HStack gap={2}>
            <Button label={t("cancel")} variant="secondary" size="sm" onClick={() => { setEditing(false); setDraft(answer ?? ""); }} />
            <Button label={t("saveAnswer")} variant="primary" size="sm" onClick={save} isLoading={busy} isDisabled={!draft.trim()} />
          </HStack>
        </VStack>
      ) : (
        <HStack gap={2} align="center" wrap="wrap">
          <Button label={answer ? t("editAnswer") : t("reply")} variant="secondary" size="sm" onClick={() => setEditing(true)} />
          {contact === null ? (
            <Button label={t("showContact")} variant="ghost" size="sm" onClick={showContact} isLoading={busy} />
          ) : (
            <Text size="sm" color="secondary">{t("contactOf", { contact })}</Text>
          )}
        </HStack>
      )}
      <FormError error={error} />
    </VStack>
  );
}
