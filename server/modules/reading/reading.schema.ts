import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { isoDateSchema } from "@/server/shared/schema";

export const readingListQuerySchema = paginationQuerySchema.extend({ from: isoDateSchema.optional(), to: isoDateSchema.optional() });
export type IReadingListQuery = z.infer<typeof readingListQuerySchema>;

/** `readAt` = when the meter was read. A bare `readOn` day means the start of that day. */
export const createReadingPayloadSchema = z
  .object({
    readAt: z.string().datetime().optional(),
    readOn: isoDateSchema.optional(),
    value: z.number().nonnegative().max(99_999_999_999),
  })
  .refine((v) => v.readAt || v.readOn, { message: "Give readAt (or readOn)", path: ["readAt"] })
  .transform((v) => {
    const readAt = new Date(v.readAt ?? `${v.readOn}T00:00:00Z`).toISOString();
    return { readAt, readOn: readAt.slice(0, 10), value: v.value };
  });
export type ICreateReadingPayload = z.output<typeof createReadingPayloadSchema>;
export interface ICreateReadingCommand extends ICreateReadingPayload, IPropertyScope {
  meterId: string;
}
export const toCreateReadingCommand = (p: ICreateReadingPayload, s: IPropertyScope, meterId: string): ICreateReadingCommand => ({ ...p, ...s, meterId });

export interface IReadingResponse {
  id: string;
  meterId: string;
  readOn: string;
  /** When the meter was read. */
  readAt: string;
  value: number;
  readBy: string;
  createdAt: string;
}
export type IReadingListResponse = IPaginated<IReadingResponse>;
export interface IReadingNeighbour {
  readOn: string;
  readAt: string;
  value: number;
}
