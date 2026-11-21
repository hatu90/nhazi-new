import type { Components, TemplatePage, TextInputProps } from "./types";

/** The form fields of a template: every TextInput block, in page order. */
export function formFields(pages: TemplatePage[]): TextInputProps[] {
  const nodes = pages.flatMap((p) => [...p.content, ...Object.values(p.zones ?? {}).flat()]) as { type: keyof Components; props: unknown }[];
  const seen = new Set<string>();
  const out: TextInputProps[] = [];
  for (const n of nodes) {
    if (n.type !== "TextInput") continue;
    const p = n.props as TextInputProps;
    const name = p.name?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push({ ...p, name });
    }
  }
  return out;
}

/** Problems that would make the form unusable: empty or duplicate field names. Checked before saving a template. */
export type FieldProblem = { kind: "noName"; label: string } | { kind: "duplicate"; name: string; count: number };

export function fieldProblems(pages: TemplatePage[]): FieldProblem[] {
  const nodes = pages.flatMap((p) => [...p.content, ...Object.values(p.zones ?? {}).flat()]) as { type: string; props: { name?: string; label?: string } }[];
  const names = new Map<string, number>();
  const problems: FieldProblem[] = [];
  for (const n of nodes) {
    if (n.type !== "TextInput") continue;
    const name = n.props.name?.trim();
    if (!name) problems.push({ kind: "noName", label: n.props.label ?? "" });
    else names.set(name, (names.get(name) ?? 0) + 1);
  }
  for (const [name, count] of names) if (count > 1) problems.push({ kind: "duplicate", name, count });
  return problems;
}

/** Stored values over the fields' default values. */
export function withDefaults(pages: TemplatePage[], stored: unknown): Record<string, string> {
  const s = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  return Object.fromEntries(formFields(pages).map((f) => [f.name, typeof s[f.name] === "string" ? (s[f.name] as string) : f.defaultValue ?? ""]));
}
