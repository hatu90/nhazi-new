/**
 * Titles the system writes itself are stored in English. This recognises them so each surface can show its own language
 * (the UI through translations, notifications through the Vietnamese templates). Anything else is a title a person typed.
 */
export interface IGeneratedTitle {
  key: "moveIn" | "transition" | "closing" | "rent" | "deposit" | "credit" | "heldCredit";
  /** Placeholders of the key's message; `inner` is itself a title (the billed line a credit refers to). */
  params: { date?: string; inner?: string; unused?: string; total?: string };
}

const PATTERNS: { re: RegExp; key: IGeneratedTitle["key"]; params: (m: RegExpExecArray) => IGeneratedTitle["params"] }[] = [
  { re: /^Move-in (\d\d\/\d\d)$/, key: "moveIn", params: (m) => ({ date: m[1] }) },
  { re: /^Invoice (\d\d\/\d\d)$/, key: "transition", params: (m) => ({ date: m[1] }) },
  { re: /^Closing (\d\d\/\d\d)$/, key: "closing", params: (m) => ({ date: m[1] }) },
  { re: /^Rent (\d\d\/\d\d–\d\d\/\d\d)$/, key: "rent", params: (m) => ({ date: m[1] }) },
  { re: /^Deposit$/, key: "deposit", params: () => ({}) },
  { re: /^Credit: (.+) \((\d+)\/(\d+) days unused\)$/, key: "credit", params: (m) => ({ inner: m[1], unused: m[2], total: m[3] }) },
  { re: /^Taken from the deposit \/ unused rent \/ services$/, key: "heldCredit", params: () => ({}) },
];

export function parseGeneratedTitle(title: string): IGeneratedTitle | null {
  for (const { re, key, params } of PATTERNS) {
    const m = re.exec(title);
    if (m) return { key, params: params(m) };
  }
  return null;
}

/** Re-renders a stored title with `render(key, params)`; the billed line inside a credit is localized the same way. */
export function localizeTitle(title: string, render: (key: IGeneratedTitle["key"], params: Record<string, string>) => string): string {
  const g = parseGeneratedTitle(title);
  if (!g) return title;
  const params = { ...g.params, inner: g.params.inner === undefined ? undefined : localizeTitle(g.params.inner, render) };
  return render(g.key, Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>);
}
