import type { IPaginated } from "@/server/shared/pagination";
import type { IReferenceAddressResponse, IReferenceAddressSearchQuery } from "./reference-address.schema";

export interface IReferenceAddressRepository {
  search(query: IReferenceAddressSearchQuery): Promise<IPaginated<IReferenceAddressResponse>>;
  /** Returns the row with the same slug if there is one, otherwise creates it. */
  findOrCreate(name: string): Promise<IReferenceAddressResponse>;
}
