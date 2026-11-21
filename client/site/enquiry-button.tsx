"use client";

import { useTranslations } from "next-intl";
import { loginUrl, useAuth } from "@/client/auth/auth-provider";
import { api } from "@/client/lib/api";
import { Modal, SelectField, TextAreaField } from "@/client/ui";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/Stack";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type EnquiryUnit = { id: string; name: string };

/** "Send enquiry" for the public property page. Signed-in accounts get a message form; others are sent to sign in and come back. */
export function EnquiryButton({ propertyId, units }: { propertyId: string; units: EnquiryUnit[] }) {
  const t = useTranslations("Site");
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);

  if (sent) return <Banner status="success" title={t("enquirySent")} />;

  const click = () => (state.status === "ready" ? setOpen(true) : router.push(loginUrl(pathname)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return setError(new Error(t("messageRequired")));
    setBusy(true);
    setError(null);
    try {
      await api(`/api/public/properties/${propertyId}/enquiries`, { method: "POST", body: { message: message.trim(), unitId: unitId || undefined } });
      setOpen(false);
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="primary" label={t("sendEnquiry")} onClick={click} isLoading={state.status === "loading"} />
      <Modal open={open} onClose={() => setOpen(false)}>
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("sendEnquiry")} onOpenChange={(o) => !o && setOpen(false)} />}
            content={
              <LayoutContent isScrollable style={{ paddingBlock: 16 }}>
                <VStack gap={3}>
                  {units.length > 0 && (
                    <SelectField label={t("unitOptional")} value={unitId} onChange={setUnitId} options={[{ value: "", label: t("anyUnit") }, ...units.map((u) => ({ value: u.id, label: u.name }))]} />
                  )}
                  <TextAreaField label={t("message")} required rows={5} value={message} onChange={setMessage} />
                </VStack>
              </LayoutContent>
            }
            footer={<LayoutFooter padding={5}><FormFooter error={error} busy={busy} submitLabel={t("send")} onCancel={() => setOpen(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </>
  );
}
