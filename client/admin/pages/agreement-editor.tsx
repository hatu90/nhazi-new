"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useState } from "react";
import { useParams } from "react-router";
import { config, emptyPage, toPages, type TemplatePage } from "@/client/agreement/config";
import { fieldProblems } from "@/client/agreement/metadata";
import { BUILT_IN_VARS } from "@/client/agreement/vars";
import { ApiError } from "@/client/lib/api";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateDetailResponse } from "@/client/lib/types";
import { ErrorBox, PageSpinner, Tag } from "@/client/ui";
import { useProperty } from "../property-layout";

const MM_TO_PX = 96 / 25.4;
const A4_VIEWPORTS = [{ width: 210 * MM_TO_PX + 64 + 16, height: 297 * MM_TO_PX + 64, label: "A4 Portrait", icon: "Tablet" as const }];

export function AgreementEditorPage() {
  const { templateId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const path = apiPath(`/agreement-templates/${templateId}`);
  const tpl = useGet<ITemplateDetailResponse>(path);
  if (tpl.isPending) return <PageSpinner />;
  if (tpl.error) return <ErrorBox error={tpl.error} retry={() => void tpl.refetch()} />;
  return <Editor key={tpl.data.currentVersion} tpl={tpl.data} path={path} canManage={canManage} back={to("agreements")} />;
}

function Editor({ tpl, path, canManage, back }: { tpl: ITemplateDetailResponse; path: string; canManage: boolean; back: string }) {
  const { apiPath } = useProperty();
  const save = useSend<{ baseVersion: number; data: { pages: TemplatePage[] } }>("POST", `${path}/versions`, [path, apiPath("/agreement-templates")]);
  const [pages, setPages] = useState<TemplatePage[]>(() => toPages(tpl.currentData));
  const [active, setActive] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const stale = save.error instanceof ApiError && save.error.code === "STALE_VERSION";

  // keep the edits of the page being edited, so switching pages never loses them
  const onChange = useCallback((page: TemplatePage) => setPages((cur) => cur.map((p, i) => (i === active ? page : p))), [active]);

  const publish = async (page: TemplatePage) => {
    const next = pages.map((p, i) => (i === active ? page : p));
    const found = fieldProblems(next);
    setProblems(found);
    setSaved(false);
    if (found.length > 0) return;
    await save.mutateAsync({ baseVersion: tpl.currentVersion, data: { pages: next } });
    setSaved(true);
  };

  const addPage = () => {
    setPages((cur) => [...cur, emptyPage()]);
    setActive(pages.length);
  };
  const removePage = () => {
    if (pages.length <= 1 || !confirm(`Remove page ${active + 1}?`)) return;
    setPages((cur) => cur.filter((_, i) => i !== active));
    setActive((i) => Math.max(0, i - 1));
  };

  return (
    <VStack gap={3}>
      <HStack gap={2} align="center" wrap="wrap">
        <Button label="Templates" variant="ghost" size="sm" href={back} />
        <Text weight="semibold">{tpl.name}</Text>
        <Tag label={`v${tpl.currentVersion}`} />
        {saved && <Text size="sm" color="secondary">Saved as a new version</Text>}
      </HStack>
      <Text size="sm" color="secondary">
        Text blocks can use {BUILT_IN_VARS.map((v) => `{{${v.key}}}`).join(" ")}. Text input blocks become form fields that are filled in on each lease.
      </Text>
      {!canManage && <Text color="secondary">You can view this template but not change it.</Text>}
      {problems.length > 0 && <ErrorBox error={new Error(problems.join(" "))} />}
      {save.error && <ErrorBox error={stale ? new Error("Someone saved a newer version. Reload the page to get it, then redo your changes.") : save.error} />}
      <div className="h-[80vh] overflow-hidden rounded border border-neutral-300">
        <Puck
          // remount per page: each page has its own editor state and history
          key={active}
          config={config}
          data={pages[active]}
          onChange={onChange}
          onPublish={publish}
          permissions={{ publish: canManage }}
          viewports={A4_VIEWPORTS}
          dictionary={{ "header-publish": "Save" }}
          overrides={{
            headerActions: ({ children }) => (
              <HStack gap={3} align="center">
                <Button label="Previous page" variant="ghost" isDisabled={active === 0} onClick={() => setActive(active - 1)}>‹</Button>
                <Text>Page {active + 1} of {pages.length}</Text>
                <Button label="Next page" variant="ghost" isDisabled={active === pages.length - 1} onClick={() => setActive(active + 1)}>›</Button>
                {canManage && <Button label="Add page" variant="ghost" onClick={addPage}>Add page</Button>}
                {canManage && <Button label="Remove page" variant="ghost" isDisabled={pages.length <= 1} onClick={removePage}>Remove page</Button>}
                {children}
              </HStack>
            ),
          }}
        />
      </div>
    </VStack>
  );
}
