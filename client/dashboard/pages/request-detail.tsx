"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEnum } from "@/client/lib/use-enum";
import { ArrowLeft } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { formatDateTime } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IRequestDetailResponse } from "@/client/lib/types";
import { DefList, ErrorBox, Modal, PageHeader, PageSpinner, Raised, Section, StatusBadge, useConfirm } from "@/client/ui";
import { ReplyFields, useReplyForm } from "@/client/ui/reply-form";
import { useLease } from "../lease-layout";

export function RequestDetailPage() {
  const t = useTranslations("Requests");
  const d = useTranslations("Dashboard");
  const c = useTranslations("Common");
  const en = useEnum();
  const locale = useLocale();
  const confirm = useConfirm();
  const { requestId = "" } = useParams();
  const { apiPath, to } = useLease();
  const path = apiPath(`/requests/${requestId}`);
  const request = useGet<IRequestDetailResponse>(path);
  const cancel = useSend<undefined>("POST", `${path}/cancel`, [apiPath("/requests")]);
  const [replying, setReplying] = useState(false);
  const reply = useReplyForm({ path, invalidate: [path], open: replying, onDone: () => setReplying(false) });

  if (request.isPending) return <PageSpinner />;
  if (request.error) return <ErrorBox error={request.error} retry={() => void request.refetch()} />;
  const r = request.data;
  const closed = r.status === "resolved" || r.status === "rejected" || r.status === "cancelled";

  return (
    <VStack gap={5}>
      <HStack><Button label={t("allRequests")} icon={<ArrowLeft size={16} />} variant="ghost" size="sm" href={to("requests")} /></HStack>
      <PageHeader
        title={r.title}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={r.status} /><Text color="secondary">{en("requestType", r.type)}</Text></HStack>}
        actions={!closed && <Button label={t("cancelRequest")} variant="secondary" isLoading={cancel.isPending} onClick={() => confirm.ask({ title: d("cancelTitle"), description: d("cancelBody"), actionLabel: t("cancelRequest"), onConfirm: () => cancel.mutateAsync(undefined) })} />}
      />
      {cancel.error && <ErrorBox error={cancel.error} />}
      <Section title={t("details")}><DefList items={[[t("sent"), formatDateTime(r.createdAt, locale)], [t("priority"), en("priority", r.priority)], [c("description"), r.description ?? "—"]]} /></Section>
      <Section title={t("conversation")}>
        <VStack gap={3}>
          {r.comments.length === 0 && <Text color="secondary">{t("noComments")}</Text>}
          {r.comments.map((cm) => (
            <Raised key={cm.id}><VStack gap={1}><HStack justify="between"><Text weight="semibold">{cm.author.displayName}</Text><Text size="sm" color="secondary">{formatDateTime(cm.createdAt, locale)}</Text></HStack><Text>{cm.body}</Text></VStack></Raised>
          ))}
          {!closed && <HStack><Button variant="primary" label={t("reply")} onClick={() => setReplying(true)} /></HStack>}
        </VStack>
      </Section>
      <Modal open={replying} onClose={() => setReplying(false)}>
        <form noValidate onSubmit={reply.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("reply")} onOpenChange={(o) => { if (!o) setReplying(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ReplyFields x={reply} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={reply.error} busy={reply.busy} submitLabel={t("sendReply")} onCancel={() => setReplying(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
