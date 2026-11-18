"use client";

/**
 * App-level building blocks over Astryx (@astryxdesign/core). Pages import from here for the composites that
 * would otherwise repeat the same wiring (labelled form fields, tables, dialogs, page headers) and import plain
 * Astryx components (Button, Card, …) straight from the package.
 */
import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Table, type TableColumn } from "@astryxdesign/core/Table";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { errorMessage } from "@/client/lib/api";

// ── responsive ─────────────────────────────────────────────────────────────────────
const MOBILE_QUERY = "(max-width: 639px)";
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Below Tailwind's `sm` breakpoint. The SPAs are client-only, so reading matchMedia during render is safe. */
export const useIsMobile = () => useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

// ── form fields (string state, error from the API's field errors) ─────────────────
interface FieldBase {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  width?: string | number;
}
const status = (error?: string) => (error ? ({ type: "error", message: error } as const) : undefined);

export function TextField({ label, error, hint, required, disabled, width, value, onChange, type, placeholder, autoFocus, autoComplete, inputMode, maxLength, hideLabel }: FieldBase & {
  /** Visually hidden label (still read by screen readers): for cells in a grid whose header names the column. */
  hideLabel?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "search" | "password";
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "decimal" | "tel" | "text";
  maxLength?: number;
}) {
  return (
    <TextInput
      label={label}
      isLabelHidden={hideLabel}
      description={hint}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      isRequired={required}
      isDisabled={disabled}
      hasAutoFocus={autoFocus}
      autoComplete={autoComplete as never}
      inputMode={inputMode}
      status={status(error)}
      width={width}
      {...(maxLength ? { maxLength } : {})}
    />
  );
}

/** Numeric input that keeps its value as a string ("" = empty), so forms can distinguish "unset" from 0. */
export function NumberField(props: FieldBase & { value: string; onChange: (v: string) => void; placeholder?: string; hideLabel?: boolean }) {
  return <TextField {...props} inputMode="decimal" onChange={(v) => props.onChange(v.replace(/[^\d.\-]/g, ""))} />;
}

export function DateField({ label, error, hint, required, disabled, width, value, onChange, min, max }: FieldBase & { value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  return (
    <DateInput
      label={label}
      description={hint}
      value={(value || undefined) as never}
      onChange={(v) => onChange(v ?? "")}
      min={min as never}
      max={max as never}
      isRequired={required}
      isDisabled={disabled}
      status={status(error)}
      width={width}
    />
  );
}

export function TextAreaField({ label, error, hint, required, disabled, width, value, onChange, rows }: FieldBase & { value: string; onChange: (v: string) => void; rows?: number }) {
  return <TextArea label={label} description={hint} value={value} onChange={onChange} rows={rows ?? 3} isRequired={required} isDisabled={disabled} status={status(error)} width={width} />;
}

export function SelectField({ label, error, hint, required, disabled, width, value, onChange, options, placeholder, search }: FieldBase & {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  search?: boolean;
}) {
  return (
    <Selector
      label={label}
      description={hint}
      options={options}
      value={value}
      onChange={(v) => onChange((v as string | null) ?? "")}
      placeholder={placeholder ?? "Select…"}
      hasSearch={search}
      isRequired={required}
      isDisabled={disabled}
      status={status(error)}
      width={width}
    />
  );
}

export function MultiField({ label, error, hint, required, disabled, width, value, onChange, options, placeholder }: FieldBase & {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return <MultiSelector label={label} description={hint} options={options} value={value} onChange={(v) => onChange(v)} placeholder={placeholder ?? "Select…"} hasSelectAll isRequired={required} isDisabled={disabled} status={status(error)} width={width} />;
}

export function CheckField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return <CheckboxInput label={label} description={hint} value={value} onChange={onChange} />;
}

// ── feedback ───────────────────────────────────────────────────────────────────────
export const PageSpinner = () => (
  <VStack align="center" padding={8}>
    <Spinner label="Loading" />
  </VStack>
);

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return <Banner status="error" title={errorMessage(error)} endContent={retry && <Button label="Retry" variant="secondary" size="sm" onClick={retry} />} />;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return <EmptyState title={title} description={hint} actions={action} isCompact />;
}

// ── layout ─────────────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <HStack justify="between" align="start" wrap="wrap" gap={3} paddingBlockEnd={5}>
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {subtitle && <Text color="secondary">{subtitle}</Text>}
      </VStack>
      {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
    </HStack>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack justify="between" align="center" gap={3}>
          <Heading level={2}>{title}</Heading>
          {action}
        </HStack>
        {children}
      </VStack>
    </Card>
  );
}

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <VStack key={k} gap={0.5}>
          <Text size="sm" color="secondary">{k}</Text>
          <Text>{v ?? "—"}</Text>
        </VStack>
      ))}
    </div>
  );
}

/** Edge-to-edge data table inside a Card, with loading / error / empty states and optional pagination. */
export function DataTable<T extends { id: string }>({
  columns,
  query,
  empty,
  paging,
}: {
  columns: { key: string; header: string; render: (row: T) => ReactNode; align?: "start" | "end" }[];
  query: { isPending: boolean; error: unknown; refetch: () => unknown; data?: { items: T[]; page: number; pageSize: number; total: number } };
  empty: ReactNode;
  paging?: (page: number) => void;
}) {
  const mobile = useIsMobile();
  const { isPending, error, data } = query;
  if (isPending) return <Card><PageSpinner /></Card>;
  if (error) return <ErrorBox error={error} retry={() => void query.refetch()} />;
  if (!data || data.items.length === 0) return <Card padding={4}>{empty}</Card>;
  const pager = paging && data.total > data.pageSize && (
    <HStack justify="end" padding={3}>
      <Pagination page={data.page} onChange={paging} totalItems={data.total} pageSize={data.pageSize} />
    </HStack>
  );
  // Phones: one card per row (first column is the title, the rest are label/value pairs) instead of a wide table.
  if (mobile) {
    const [first, ...rest] = columns;
    return (
      <VStack gap={2}>
        {data.items.map((row) => (
          <Card key={row.id} padding={3}>
            <VStack gap={1.5}>
              <Text weight="semibold">{first.render(row)}</Text>
              {rest.map((c) =>
                c.header ? (
                  <HStack key={c.key} justify="between" align="center" gap={3}>
                    <Text size="sm" color="secondary">{c.header}</Text>
                    <Text size="sm" as="div">{c.render(row)}</Text>
                  </HStack>
                ) : (
                  <HStack key={c.key} justify="end">{c.render(row)}</HStack>
                ),
              )}
            </VStack>
          </Card>
        ))}
        {pager}
      </VStack>
    );
  }
  const cols: TableColumn<T & Record<string, unknown>>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    align: c.align,
    renderCell: (row) => c.render(row as T),
  }));
  return (
    <Card>
      <Table data={data.items as (T & Record<string, unknown>)[]} columns={cols} idKey="id" hasHover />
      {pager}
    </Card>
  );
}

const ModalContext = createContext<{ title: string; onClose: () => void } | null>(null);

/** Dialog shell. Put a <ModalBody> (or a form's <FormBody>) inside it. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const mobile = useIsMobile();
  return (
    <Dialog isOpen={open} onOpenChange={(o) => !o && onClose()} width={wide ? 760 : 480} maxHeight="85dvh" padding={0} purpose="form" variant={mobile ? "fullscreen" : "standard"}>
      <ModalContext value={{ title, onClose }}>{open ? children : null}</ModalContext>
    </Dialog>
  );
}

/**
 * Dialog content on Astryx's Layout: the title bar and the footer (`footer`, e.g. form buttons) stay pinned and only the
 * body scrolls, on phones (fullscreen) and on desktop (capped height) alike.
 */
export function ModalBody({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const modal = useContext(ModalContext);
  if (!modal) throw new Error("ModalBody must be rendered inside <Modal>");
  return (
    <Layout
      height="fill"
      padding={5}
      header={<div className="py-3"><DialogHeader title={modal.title} onOpenChange={(o) => !o && modal.onClose()} /></div>}
      content={<LayoutContent isScrollable><div className="py-4">{children}</div></LayoutContent>}
      footer={footer && <LayoutFooter><div className="py-3">{footer}</div></LayoutFooter>}
    />
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <TabList value={value} onChange={(v) => onChange(v as T)} hasDivider overflow="scroll">
      {tabs.map((t) => <Tab key={t.id} value={t.id} label={t.label} />)}
    </TabList>
  );
}

// ── status badges ──────────────────────────────────────────────────────────────────
const statusVariant: Record<string, BadgeVariant> = {
  active: "success", paid: "success", confirmed: "success", resolved: "success", accepted: "success",
  upcoming: "info", open: "info",
  in_progress: "warning", partial: "warning", pending: "warning", high: "warning",
  rejected: "error", declined: "error", urgent: "error",
};
export const StatusBadge = ({ status }: { status: string }) => <Badge variant={statusVariant[status] ?? "neutral"} label={status.replace(/_/g, " ")} />;
export const Tag = ({ label, tone = "neutral" }: { label: string; tone?: BadgeVariant }) => <Badge variant={tone} label={label} />;

/** Small helper for the common "label + button row" at the bottom of a form. */
export const FormActions = ({ children }: { children: ReactNode }) => <HStack gap={2}>{children}</HStack>;
