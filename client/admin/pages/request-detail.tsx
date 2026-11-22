"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { MessageSquare } from "lucide-react";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useParams } from "react-router";
import { useEnumOptions } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IRequestDetailResponse, RequestStatus } from "@/client/lib/types";
import { ErrorBox, Modal, PageHeader, PageSpinner, Section, SelectField, StatusBadge } from "@/client/ui";
import { RequestTypeIcon } from "@/client/requests/type-icon";
import { RequestBody, RequestFacts } from "@/client/requests/request-facts";
import { RequestThread } from "@/client/requests/request-thread";
import { ReplyFields, useReplyForm } from "@/client/ui/reply-form";
import { useProperty } from "../property-layout";

const statuses: RequestStatus[] = ["open", "in_progress", "resolved", "rejected"];

export function RequestDetailPage() {
  const t = useTranslations("Requests");
  const options = useEnumOptions();
  const { requestId = "" } = useParams();
  const { apiPath, role, to } = useProperty();
  const path = apiPath(`/requests/${requestId}`);
  const request = useGet<IRequestDetailResponse>(path);
  const update = useSend<{ status: RequestStatus }>("PATCH", path, [apiPath("/requests")]);
  const [replying, setReplying] = useState(false);
  const reply = useReplyForm({ path, invalidate: [path], open: replying, onDone: () => setReplying(false) });

  if (request.isPending) return <PageSpinner />;
  if (request.error) return <ErrorBox error={request.error} retry={() => void request.refetch()} />;
  const r = request.data;
  const closed = r.status === "resolved" || r.status === "rejected" || r.status === "cancelled";

  return (
    <VStack gap={5}>
      <HStack><Button label={t("allRequests")} variant="ghost" size="sm" href={to("requests")} /></HStack>
      <PageHeader title={r.title} subtitle={<HStack gap={2} align="center"><RequestTypeIcon type={r.type} size={24} /><StatusBadge status={r.status} /><StatusBadge status={r.priority} /></HStack>}
        actions={role !== "viewer" && !closed && <SelectField label={t("setStatus")} value={r.status} onChange={(v) => update.mutate({ status: v as RequestStatus })} options={options("status", statuses)} width={180} />} />
      {update.error && <ErrorBox error={update.error} />}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <VStack gap={5}>
          <RequestBody r={r} />
          <Section title={t("conversation")}>
            <VStack gap={4}>
              <RequestThread comments={r.comments} />
              {role !== "viewer" && <HStack><Button variant="primary" icon={<MessageSquare size={16} />} label={t("reply")} onClick={() => setReplying(true)} /></HStack>}
            </VStack>
          </Section>
        </VStack>
        <RequestFacts r={r} showRequester={true} />
      </div>
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
    </VStack>
  );
}
