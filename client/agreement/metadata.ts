import { FIELD_TYPES, type TemplatePage } from "./types";

type Node = { type: string; props: { name?: string; label?: string; defaultValue?: string } };
const nodesOf = (pages: TemplatePage[]) => pages.flatMap((p) => [...p.content, ...Object.values(p.zones ?? {}).flat()]) as Node[];
const isField = (n: Node) => (FIELD_TYPES as readonly string[]).includes(n.type);

/** The form fields of a template (text, date, image), unique by name, in page order. */
export function formFields(pages: TemplatePage[]): { name: string; defaultValue: string }[] {
  const seen = new Set<string>();
  const out: { name: string; defaultValue: string }[] = [];
  for (const n of nodesOf(pages)) {
    const name = isField(n) ? n.props.name?.trim() : undefined;
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push({ name, defaultValue: n.props.defaultValue ?? "" });
    }
  }
  return out;
}

/** Problems that would make the form unusable: empty or duplicate field names. Checked before saving a template. */
export type FieldProblem = { kind: "noName"; label: string } | { kind: "duplicate"; name: string; count: number };

export function fieldProblems(pages: TemplatePage[]): FieldProblem[] {
  const names = new Map<string, number>();
  const problems: FieldProblem[] = [];
  for (const n of nodesOf(pages)) {
    if (!isField(n)) continue;
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
  return Object.fromEntries(formFields(pages).map((f) => [f.name, typeof s[f.name] === "string" ? (s[f.name] as string) : f.defaultValue]));
}
