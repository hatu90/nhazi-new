"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useGet, useSend } from "@/client/lib/hooks";
import { formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { DefList, ErrorBox, Modal, Section, useConfirm } from "@/client/ui";
import { FormFooter } from "../../ui/rhf";
import { PropertyFields, usePropertyForm } from "../property-form";
import { useProperty } from "../property-layout";
import { TeamPage } from "./team";

const formatDistance = (m: number | null) => (m === null ? null : m >= 1000 ? `${(m / 1000).toFixed(1).replace(/\.0$/, "")} km` : `${m} m`);

function ImageTile({ base, path, cover }: { base: string; path: string; cover: boolean }) {
  const t = useTranslations("Property");
  const url = useGet<{ url: string }>(`${base}/files`, { path });
  return (
    <div style={{ position: "relative", height: 140, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url.data && <img src={url.data.url} alt={t("image")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      {cover && <span style={{ position: "absolute", top: 8, left: 8, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "rgba(0,0,0,0.65)", color: "#fff" }}>{t("cover")}</span>}
    </div>
  );
}

/** Flat page: a heading and its content per block, blocks separated by a divider (no cards around cards). */
export function SettingsPage() {
  const t = useTranslations("Settings");
  const c = useTranslations("Common");
  const en = useEnum();
  const { property, canManage, isOwner, apiPath } = useProperty();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const remove = useSend("DELETE", apiPath(), ["/api/admin/properties"]);
  const [editing, setEditing] = useState(false);
  const images = property.headerImage && !property.images.includes(property.headerImage) ? [property.headerImage, ...property.images] : property.images;
  const propertyForm = usePropertyForm({ initial: property, method: "PATCH", path: apiPath(), open: editing, onDone: () => setEditing(false) });

  return (
    <VStack gap={6}>
      <Section title={t("property")} action={canManage && <Button variant="primary" label={t("edit")} onClick={() => setEditing(true)} />}>
        <DefList items={[
          [c("name"), property.name],
          [t("category"), en("category", property.category)],
          [t("address"), `${property.street}, ${property.ward.name}, ${property.province.name}`],
          [t("askingRent"), property.rentNegotiable ? t("negotiable") : property.rentPriceFrom === null ? "—" : `${formatMoney(property.rentPriceFrom)}${property.rentPriceTo !== null ? ` – ${formatMoney(property.rentPriceTo)}` : ""}`],
        ]} />
      </Section>
      <Section title={t("nearby")}>
        {property.referenceAddresses.length === 0 ? <Text>—</Text> : (
          <VStack gap={1}>
            {property.referenceAddresses.map((r) => (
              <HStack key={r.id} justify="between" align="center" gap={3}>
                <Text>{r.name}</Text>
                <Text color="secondary">{formatDistance(r.distance) ?? "—"}</Text>
              </HStack>
            ))}
          </VStack>
        )}
      </Section>
      <Section title={t("images")}>
        {images.length === 0 ? <Text>{c("none")}</Text> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {images.map((p) => <ImageTile key={p} base={apiPath()} path={p} cover={p === property.headerImage} />)}
          </div>
        )}
      </Section>
      <Section title={t("rules")}>
        {property.rules.length === 0 ? <Text>—</Text> : <ul className="list-disc space-y-1 pl-5">{property.rules.map((r, i) => <li key={i}><Text>{r}</Text></li>)}</ul>}
      </Section>
      <TeamPage />
      {isOwner && (
        <Section title={t("dangerZone")}>
          <VStack gap={3} align="start">
            <Text color="secondary">{t("deleteBody")}</Text>
            {deleteError != null && <ErrorBox error={deleteError} />}
            <Button variant="secondary" label={t("deleteProperty")} onClick={() => confirm.ask({
              title: t("deleteTitle", { name: property.name }),
              description: t("deleteBody"),
              actionLabel: c("delete"),
              onConfirm: async () => {
                setDeleteError(null);
                try { await remove.mutateAsync(undefined); navigate("/"); } catch (e) { setDeleteError(e); }
              },
            })} />
          </VStack>
        </Section>
      )}
      {confirm.element}
      <Modal open={editing} onClose={() => setEditing(false)}>
        <form noValidate onSubmit={propertyForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("edit")} onOpenChange={(o) => { if (!o) setEditing(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <PropertyFields x={propertyForm} />
            </LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={propertyForm.error} busy={propertyForm.busy} submitLabel={t("saveChanges")} onCancel={() => setEditing(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
