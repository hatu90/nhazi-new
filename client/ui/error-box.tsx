"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { errorMessage } from "@/client/lib/api";

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return <Banner status="error" title={errorMessage(error)} endContent={retry && <Button label="Retry" variant="secondary" size="sm" onClick={retry} />} />;
}
