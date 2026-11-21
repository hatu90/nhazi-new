"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IRequestListResponse, IRequestResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, StatusBadge } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useLease } from "../lease-layout";
import { RequestFields, useRequestForm } from "./request-form";

export function RequestsPage() {
  const { apiPath, to, lease } = useLease();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const newRequest = useRequestForm({ open: creating, onDone: () => setCreating(false) });
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20 }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <HStack justify="end"><Button variant="primary" label="New request" onClick={() => setCreating(true)} isDisabled={lease.status === "ended"} /></HStack>
      <DataTable<IRequestResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No requests" hint="Report a repair, ask a question, or ask to end your lease." action={<Button variant="primary" label="New request" onClick={() => setCreating(true)} />} />}
        columns={[
          { key: "t", header: "Request", render: (r) => <Link href={to(`requests/${r.id}`)}>{r.title}</Link> },
          { key: "ty", header: "Type", render: (r) => label(r.type) },
          { key: "c", header: "Created", render: (r) => formatDate(r.createdAt) },
          { key: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={newRequest.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"New request"} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><RequestFields x={newRequest} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={newRequest.error} busy={newRequest.busy} submitLabel={"Send request"} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}

