"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createConfig, emptyPage, toPages } from "@/client/agreement/config";
import type { TemplatePage } from "@/client/agreement/types";
import { fieldProblems, type FieldProblem } from "@/client/agreement/metadata";
import { useSend } from "@/client/lib/hooks";
import type { ITemplateDetailResponse } from "@/client/lib/types";
import { ErrorBox, Tag, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";

export const MM_TO_PX = 96 / 25.4;

export const a4Viewports = (label: string) => [{ width: 210 * MM_TO_PX + 64 + 16, height: 297 * MM_TO_PX + 64, label, icon: "Tablet" as const }];

/** Takes the editor's root `title` field out of a page: it is the template name, not part of the stored pages. */
function splitTitle(page: TemplatePage): { name: string | undefined; rest: TemplatePage } {
  const { title, ...props } = (page.root?.props ?? {}) as { title?: string };
  return { name: title, rest: { ...page, root: { ...page.root, props } } as TemplatePage };
}

export function AgreementEditorPanel({ tpl, path, canManage, back }: { tpl: ITemplateDetailResponse; path: string; canManage: boolean; back: string }) {
  const t = useTranslations("Agreements");
  const c = useTranslations("Common");
  const editor = useTranslations("AgreementEditor");
  const config = useMemo(() => createConfig(editor), [editor]);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { apiPath } = useProperty();
  const save = useSend<{ baseVersion: number; data: { pages: TemplatePage[] } }>("POST", `${path}/versions`, [path, apiPath("/agreement-templates")]);
  const rename = useSend<{ name: string }>("PATCH", path, [path, apiPath("/agreement-templates")]);
  // the editor's "title" field on the page is the template's name
  const [title, setTitle] = useState(tpl.name);
  const [pages, setPages] = useState<TemplatePage[]>(() => toPages(tpl.currentData));
  const [active, setActive] = useState(0);
  const [problems, setProblems] = useState<FieldProblem[]>([]);

  // keep the edits of the page being edited, so switching pages never loses them
  const onChange = useCallback((page: TemplatePage) => {
    const { name, rest } = splitTitle(page);
    if (name !== undefined) setTitle(name);
    setPages((cur) => cur.map((p, i) => (i === active ? rest : p)));
  }, [active]);

  const publish = async (page: TemplatePage) => {
    const { name, rest } = splitTitle(page);
    const next = pages.map((p, i) => (i === active ? rest : p));
    const found = fieldProblems(next);
    setProblems(found);
    if (found.length > 0) return;
    const newName = (name ?? title).trim() || tpl.name;
    if (newName !== tpl.name) await rename.mutateAsync({ name: newName });
    await save.mutateAsync({ baseVersion: tpl.currentVersion, data: { pages: next } });
    navigate(back);
  };

  const addPage = () => {
    setPages((cur) => [...cur, emptyPage()]);
    setActive(pages.length);
  };
  const removePage = () => {
    if (pages.length <= 1) return;
    confirm.ask({
      title: t("removePageTitle", { n: active + 1 }),
      description: t("removePageBody"),
      actionLabel: t("removePage"),
      onConfirm: () => {
        setPages((cur) => cur.filter((_, i) => i !== active));
        setActive((i) => Math.max(0, i - 1));
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-2 bg-white p-3">
      <HStack gap={2} align="center" wrap="wrap">
        <Button label={t("templates")} variant="ghost" size="sm" href={back} />
        <Tag label={`v${tpl.currentVersion}`} />
        <HStack gap={2} align="center">
          <Button label={t("prevPage")} variant="ghost" isDisabled={active === 0} onClick={() => setActive(active - 1)}>‹</Button>
          <Text>{t("pageOf", { n: active + 1, total: pages.length })}</Text>
          <Button label={t("nextPage")} variant="ghost" isDisabled={active === pages.length - 1} onClick={() => setActive(active + 1)}>›</Button>
          {canManage && <Button icon={<Plus size={16} />} label={t("addPage")} variant="ghost" onClick={addPage}>{t("addPage")}</Button>}
          {canManage && <Button label={t("removePage")} variant="ghost" isDisabled={pages.length <= 1} onClick={removePage}>{t("removePage")}</Button>}
        </HStack>
        <HStack gap={2} align="center" style={{ marginLeft: "auto" }}>
          <Button label={c("cancel")} variant="secondary" onClick={() => navigate(back)} />
          {canManage && <Button label={c("save")} variant="primary" isDisabled={save.isPending} onClick={() => void publish(pages[active])} />}
        </HStack>
      </HStack>
      {!canManage && <Text color="secondary">{t("viewOnly")}</Text>}
      {problems.length > 0 && <ErrorBox error={new Error(problems.map((p) => (p.kind === "noName" ? t("problemNoName", { label: p.label }) : t("problemDuplicate", { name: p.name, count: p.count }))).join(" "))} />}
      {rename.error && <ErrorBox error={rename.error} />}
      {save.error && <ErrorBox error={save.error} />}
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-neutral-300">
        <Puck
          // remount per page: each page has its own editor state and history
          key={active}
          config={config}
          data={{ ...pages[active], root: { ...pages[active].root, props: { ...pages[active].root?.props, title } } } as TemplatePage}
          onChange={onChange}
          onPublish={publish}
          viewports={a4Viewports(t("a4"))}
          overrides={{ header: () => <></> }}
        />
      </div>
      {confirm.element}
    </div>
  );
}
