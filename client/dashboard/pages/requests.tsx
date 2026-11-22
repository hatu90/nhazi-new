"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { useGet } from "@/client/lib/hooks";
import type { IRequestListResponse } from "@/client/lib/types";
import { Empty, Modal } from "@/client/ui";
import { RequestList } from "@/client/requests/request-list";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { useLease } from "../lease-layout";
import { RequestFields, useRequestForm } from "./request-form";

export function RequestsPage() {
  const t = useTranslations("Requests");
  const d = useTranslations("Dashboard");
  const { apiPath, to, lease } = useLease();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const newRequest = useRequestForm({ open: creating, onDone: () => setCreating(false) });
  const query = useGet<IRequestListResponse>(apiPath("/requests"), { page, pageSize: 20 }, { keepPrevious: true });
  return (
    <Stack gap={4}>
      <HStack justify="end"><Button icon={<Plus size={16} />} variant="primary" label={t("newRequest")} onClick={() => setCreating(true)} isDisabled={lease.status === "ended"} /></HStack>
      <RequestList
        query={query}
        paging={setPage}
        hrefFor={(r) => to(`requests/${r.id}`)}
        empty={<Empty title={t("empty")} hint={d("requestsHint")} action={<Button icon={<Plus size={16} />} variant="primary" label={t("newRequest")} onClick={() => setCreating(true)} isDisabled={lease.status === "ended"} />} />}
      />
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={newRequest.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("newRequest")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><RequestFields x={newRequest} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={newRequest.error} busy={newRequest.busy} submitLabel={d("sendRequest")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}

