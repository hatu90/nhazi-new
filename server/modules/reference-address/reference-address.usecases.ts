import type { IUseCase } from "@/server/shared/usecase";
import type { IReferenceAddressRepository } from "./reference-address.repository";
import type {
  ICreateReferenceAddressPayload,
  IReferenceAddressListResponse,
  IReferenceAddressResponse,
  IReferenceAddressSearchQuery,
} from "./reference-address.schema";

export class SearchReferenceAddressesUseCase implements IUseCase<IReferenceAddressSearchQuery, IReferenceAddressListResponse> {
  constructor(private readonly referenceAddresses: IReferenceAddressRepository) {}
  execute(query: IReferenceAddressSearchQuery) {
    return this.referenceAddresses.search(query);
  }
}

/** Idempotent: the same name (same slug) returns the existing reference address. */
export class CreateReferenceAddressUseCase implements IUseCase<ICreateReferenceAddressPayload, IReferenceAddressResponse> {
  constructor(private readonly referenceAddresses: IReferenceAddressRepository) {}
  execute({ name }: ICreateReferenceAddressPayload) {
    return this.referenceAddresses.findOrCreate(name);
  }
}
