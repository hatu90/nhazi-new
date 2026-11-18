"use client";

import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { formatDate, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IRequestListResponse, IRequestResponse, RequestPriority, RequestType } from "@/client/lib/types";
import { DataTable, Empty, Modal, StatusBadge } from "@/client/ui";
import { text } from "@/client/ui/form";
import { FArea, FDate, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useLease } from "../lease-layout";

const types: RequestType[] = ["maintenance", "close_lease", "enquiry"];
const priorities: RequestPriority[] = ["low", "normal", "high", "urgent"];

export function RequestsPage() {
  const { apiPath, to, lease } = useLease();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20 }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <HStack justify="end"><Button label="New request" onClick={() => setCreating(true)} isDisabled={lease.status === "ended"} /></HStack>
      <DataTable<IRequestResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No requests" hint="Report a repair, ask a question, or ask to end your lease." action={<Button label="New request" onClick={() => setCreating(true)} />} />}
        columns={[
          { key: "t", header: "Request", render: (r) => <Link href={to(`requests/${r.id}`)}>{r.title}</Link> },
          { key: "ty", header: "Type", render: (r) => label(r.type) },
          { key: "c", header: "Created", render: (r) => formatDate(r.createdAt) },
          { key: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)} title="New request">{creating && <RequestForm onDone={() => setCreating(false)} />}</Modal>
    </Stack>
  );
}

interface Values {
  type: RequestType;
  title: string;
  description: string;
  priority: RequestPriority;
  requestedCloseDate: string;
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const { apiPath, to } = useLease();
  const navigate = useNavigate();
  const save = useSend<object, { id: string }>("POST", apiPath("/requests"), [apiPath("/requests")]);
  const form = useForm<Values>({ defaultValues: { type: "maintenance", title: "", description: "", priority: "normal", requestedCloseDate: "" } });
  const type = useWatch({ control: form.control, name: "type" });
  const submit = useSubmit(
    form,
    save,
    (v) => ({ type: v.type, title: v.title.trim(), description: text(v.description), priority: v.priority, requestedCloseDate: v.type === "close_lease" ? v.requestedCloseDate : undefined }),
    (r) => { onDone(); navigate(to(`requests/${r.id}`)); },
  );
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Send request" onCancel={onDone}>
      <FSelect control={form.control} name="type" label="Type" options={types.map((t) => ({ value: t, label: label(t) }))} width="100%" />
      <FText control={form.control} name="title" label="Title" required width="100%" />
      <FArea control={form.control} name="description" label="Details" width="100%" />
      <FSelect control={form.control} name="priority" label="Priority" options={priorities.map((p) => ({ value: p, label: label(p) }))} width="100%" />
      {type === "close_lease" && <FDate control={form.control} name="requestedCloseDate" label="Move-out date" required width="100%" />}
    </FormBody>
  );
}
