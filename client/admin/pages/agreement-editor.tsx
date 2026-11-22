"use client";

import { useGet } from "@/client/lib/hooks";
import type { ITemplateDetailResponse } from "@/client/lib/types";
import { ErrorBox, PageSkeleton } from "@/client/ui";
import "@puckeditor/core/puck.css";
import { useParams } from "react-router";
import { useProperty } from "../property-layout";
import { AgreementEditorPanel } from "./agreement-editor-panel";

export function AgreementEditorPage() {
  const { templateId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const path = apiPath(`/agreement-templates/${templateId}`);
  const tpl = useGet<ITemplateDetailResponse>(path);
  if (tpl.isPending) return <PageSkeleton />;
  if (tpl.error) return <ErrorBox error={tpl.error} retry={() => void tpl.refetch()} />;
  return <AgreementEditorPanel key={tpl.data.currentVersion} tpl={tpl.data} path={path} canManage={canManage} back={to("agreements")} />;
}
