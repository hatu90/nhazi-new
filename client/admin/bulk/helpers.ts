/** Pure helpers for the bulk meters setup and the bulk units grid (no React, easy to reason about). */

/** Meter name = `prefix - room - postfix`; an empty prefix or postfix is left out. */
export const meterName = (prefix: string, room: string, postfix: string) =>
  [prefix.trim(), room, postfix.trim()].filter(Boolean).join(" - ");

/** "Room 101" -> "Room 102", "A-9" -> "A-10"; names without a trailing number are returned unchanged. */
export const nextName = (name: string) => name.replace(/(\d+)(\D*)$/, (_, n: string, tail: string) => String(Number(n) + 1).padStart(n.length, "0") + tail);

export const FLOOR_TOKEN = "{FLOOR}";
export const INDEX_TOKEN = "{NN}";

/** Name pattern -> unit name: `Room {FLOOR}{NN}` with floor 2, index 3 -> "Room 203". `{NN}` counts from 1, two digits. */
export const unitNameFor = (pattern: string, floor: number, index: number) =>
  pattern.split(FLOOR_TOKEN).join(String(floor)).split(INDEX_TOKEN).join(String(index).padStart(2, "0")).trim();
