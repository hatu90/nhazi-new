"use client";

import { config, emptyPage, toPages } from "@/client/agreement/config";
import type { TemplatePage } from "@/client/agreement/types";
import { fieldProblems } from "@/client/agreement/metadata";
import { ApiError } from "@/client/lib/api";
import { useSend } from "@/client/lib/hooks";
import type { ITemplateDetailResponse } from "@/client/lib/types";
import { ErrorBox, Tag, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useState } from "react";
import { useProperty } from "../property-layout";

export const MM_TO_PX = 96 / 25.4;

export const A4_VIEWPORTS = [{ width: 210 * MM_TO_PX + 64 + 16, height: 297 * MM_TO_PX + 64, label: "A4 Portrait", icon: "Tablet" as const }];

export function AgreementEditorPanel({ tpl, path, canManage, back }: { tpl: ITemplateDetailResponse; path: string; canManage: boolean; back: string }) {
  const confirm = useConfirm();
  const { apiPath } = useProperty();
  const save = useSend<{ baseVersion: number; data: { pages: TemplatePage[] } }>("POST", `${path}/versions`, [path, apiPath("/agreement-templates")]);
  const rename = useSend<{ name: string }>("PATCH", path, [path, apiPath("/agreement-templates")]);
  const [title, setTitle] = useState(tpl.name);
  const commitTitle = () => {
    const name = title.trim();
    if (!name) return setTitle(tpl.name);
    if (name !== tpl.name) rename.mutate({ name }, { onError: () => setTitle(tpl.name) });
  };
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
    if (pages.length <= 1) return;
    confirm.ask({
      title: `Remove page ${active + 1}?`,
      description: "The page and its content are removed from this version.",
      actionLabel: "Remove page",
      onConfirm: () => {
        setPages((cur) => cur.filter((_, i) => i !== active));
        setActive((i) => Math.max(0, i - 1));
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-2 bg-white p-3">
      <HStack gap={2} align="center" wrap="wrap">
        <Button label="Templates" variant="ghost" size="sm" href={back} />
        <input
          aria-label="Agreement name"
          value={title}
          maxLength={100}
          readOnly={!canManage}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(tpl.name); e.currentTarget.blur(); } }}
          className="min-w-64 rounded border border-transparent px-2 py-1 text-lg font-semibold hover:border-neutral-300 focus:border-neutral-400 focus:outline-none"
        />
        <Tag label={`v${tpl.currentVersion}`} />
        {saved && <Text size="sm" color="secondary">Saved as a new version</Text>}
      </HStack>
      {!canManage && <Text color="secondary">You can view this template but not change it.</Text>}
      {problems.length > 0 && <ErrorBox error={new Error(problems.join(" "))} />}
      {rename.error && <ErrorBox error={rename.error} />}
      {save.error && <ErrorBox error={stale ? new Error("Someone saved a newer version. Reload the page to get it, then redo your changes.") : save.error} />}
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-neutral-300">
        <Puck
          // remount per page: each page has its own editor state and history
          key={active}
          config={config}
          data={pages[active]}
          onChange={onChange}
          onPublish={publish}
          permissions={{ publish: canManage }}
          headerTitle={title}
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
      {confirm.element}
    </div>
  );
}
