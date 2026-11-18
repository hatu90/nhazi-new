import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { isoDateSchema } from "@/server/shared/schema";

export const readingListQuerySchema = paginationQuerySchema.extend({ from: isoDateSchema.optional(), to: isoDateSchema.optional() });
export type IReadingListQuery = z.infer<typeof readingListQuerySchema>;

/** `readOn` = the day whose START the value was read at (see nhazi.dbml). */
export const createReadingPayloadSchema = z.object({
  readOn: isoDateSchema,
  value: z.number().nonnegative().max(99_999_999_999),
});
export type ICreateReadingPayload = z.infer<typeof createReadingPayloadSchema>;
export interface ICreateReadingCommand extends ICreateReadingPayload, IPropertyScope {
  meterId: string;
}
export const toCreateReadingCommand = (p: ICreateReadingPayload, s: IPropertyScope, meterId: string): ICreateReadingCommand => ({ ...p, ...s, meterId });

export interface IReadingResponse {
  id: string;
  meterId: string;
  readOn: string;
  value: number;
  readBy: string;
  createdAt: string;
}
export type IReadingListResponse = IPaginated<IReadingResponse>;
export interface IReadingNeighbour {
  readOn: string;
  value: number;
}
