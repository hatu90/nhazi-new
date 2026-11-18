/** Pure helpers for the bulk meters setup and the bulk units grid (no React, easy to reason about). */

export const ROOM_TOKEN = "{ROOM_NAME}";
export const NEW_SERVICE = "__new__";

/** Default meter name for a service: `<service> - {ROOM_NAME}`. */
export const autoTemplate = (serviceName: string) => `${serviceName.trim() || "Meter"} - ${ROOM_TOKEN}`;

/** `Electricity - {ROOM_NAME}` / `{ROOM_NAME} - Electricity`: the token is replaced by the unit's name (prefix or postfix is just where you put it). */
export const meterName = (template: string, room: string) => template.split(ROOM_TOKEN).join(room).trim();

/** "Room 101" -> "Room 102", "A-9" -> "A-10"; names without a trailing number are returned unchanged. */
export const nextName = (name: string) => name.replace(/(\d+)(\D*)$/, (_, n: string, tail: string) => String(Number(n) + 1).padStart(n.length, "0") + tail);

export const FLOOR_TOKEN = "{FLOOR}";
export const INDEX_TOKEN = "{NN}";

/** Name pattern -> unit name: `Room {FLOOR}{NN}` with floor 2, index 3 -> "Room 203". `{NN}` counts from 1, two digits. */
export const unitNameFor = (pattern: string, floor: number, index: number) =>
  pattern.split(FLOOR_TOKEN).join(String(floor)).split(INDEX_TOKEN).join(String(index).padStart(2, "0")).trim();
