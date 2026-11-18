"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useParams } from "react-router";
import { formatDateTime, formatDate, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IRequestDetailResponse, RequestStatus } from "@/client/lib/types";
import { DefList, ErrorBox, Modal, PageHeader, PageSpinner, Raised, Section, SelectField, StatusBadge } from "@/client/ui";
import { ReplyForm } from "@/client/ui/reply-form";
import { useProperty } from "../property-layout";

const statuses: RequestStatus[] = ["open", "in_progress", "resolved", "rejected"];

export function RequestDetailPage() {
  const { requestId = "" } = useParams();
  const { apiPath, role, to } = useProperty();
  const path = apiPath(`/requests/${requestId}`);
  const request = useGet<IRequestDetailResponse>(path);
  const update = useSend<{ status: RequestStatus }>("PATCH", path, [apiPath("/requests")]);
  const [replying, setReplying] = useState(false);

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
          {role !== "viewer" && <HStack><Button label="Reply" onClick={() => setReplying(true)} /></HStack>}
        </VStack>
      </Section>
      <Modal open={replying} onClose={() => setReplying(false)} title="Reply">{replying && <ReplyForm path={path} invalidate={[path]} onDone={() => setReplying(false)} />}</Modal>
    </VStack>
  );
}
