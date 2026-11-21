"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { formatDateTime, formatDate, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IRequestDetailResponse, RequestStatus } from "@/client/lib/types";
import { DefList, ErrorBox, Modal, PageHeader, PageSpinner, Raised, Section, SelectField, StatusBadge } from "@/client/ui";
import { ReplyFields, useReplyForm } from "@/client/ui/reply-form";
import { useProperty } from "../property-layout";

const statuses: RequestStatus[] = ["open", "in_progress", "resolved", "rejected"];

export function RequestDetailPage() {
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
      <HStack><Button label="All requests" variant="ghost" size="sm" href={to("requests")} /></HStack>
      <PageHeader title={r.title} subtitle={<HStack gap={2} align="center"><StatusBadge status={r.status} /><StatusBadge status={r.priority} /><Text color="secondary">{label(r.type)} · {r.unitName ?? "no unit"}</Text></HStack>}
        actions={role !== "viewer" && !closed && <SelectField label="Set status" value={r.status} onChange={(v) => update.mutate({ status: v as RequestStatus })} options={statuses.map((s) => ({ value: s, label: label(s) }))} width={180} />} />
      {update.error && <ErrorBox error={update.error} />}
      <Section title="Details">
        <DefList items={[["From", r.requestedBy.displayName], ["Created", formatDateTime(r.createdAt)], ["Assigned to", r.assignedTo?.displayName ?? "—"], ["Requested close date", formatDate(r.requestedCloseDate)], ["Description", r.description ?? "—"]]} />
      </Section>
      <Section title="Conversation">
        <VStack gap={3}>
          {r.comments.length === 0 && <Text color="secondary">No comments yet.</Text>}
          {r.comments.map((c) => (
            <Raised key={c.id}><VStack gap={1}><HStack justify="between"><Text weight="semibold">{c.author.displayName}</Text><Text size="sm" color="secondary">{formatDateTime(c.createdAt)}</Text></HStack><Text>{c.body}</Text></VStack></Raised>
          ))}
          {role !== "viewer" && <HStack><Button variant="primary" label="Reply" onClick={() => setReplying(true)} /></HStack>}
        </VStack>
      </Section>
      <Modal open={replying} onClose={() => setReplying(false)}>
        <form noValidate onSubmit={reply.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Reply"} onOpenChange={(o) => { if (!o) setReplying(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ReplyFields x={reply} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={reply.error} busy={reply.busy} submitLabel={"Send reply"} onCancel={() => setReplying(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
