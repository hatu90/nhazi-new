import type { IPaginated } from "@/server/shared/pagination";
import type { ICreateReadingCommand, IReadingListQuery, IReadingNeighbour, IReadingResponse } from "./reading.schema";

export interface IReadingRepository {
  /** Meter existence + the facts the rules need. */
  findMeter(propertyId: string, meterId: string): Promise<{ id: string; removedAt: string | null; maxValue: number | null } | null>;
  list(meterId: string, query: IReadingListQuery): Promise<IPaginated<IReadingResponse>>;
  /** Closest live readings strictly before / after the moment `readAt`. */
  neighbours(meterId: string, readAt: string): Promise<{ prev: IReadingNeighbour | null; next: IReadingNeighbour | null }>;
  /** ConflictError READING_EXISTS when the meter already has a reading at that moment. */
  create(command: ICreateReadingCommand): Promise<IReadingResponse>;
  findById(meterId: string, readingId: string): Promise<IReadingResponse | null>;
  /** True when a usage already bills from this reading. */
  isBilled(readingId: string): Promise<boolean>;
  softDelete(meterId: string, readingId: string): Promise<boolean>;
}
