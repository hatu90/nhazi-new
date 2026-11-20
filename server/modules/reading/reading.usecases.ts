import type { IPropertyScope } from "@/server/shared/actor";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IReadingRepository } from "./reading.repository";
import type { ICreateReadingCommand, IReadingListQuery, IReadingListResponse, IReadingResponse } from "./reading.schema";

abstract class Base {
  constructor(protected readonly readings: IReadingRepository, protected readonly policy: AccessPolicy) {}
  protected async meter(propertyId: string, meterId: string) {
    const m = await this.readings.findMeter(propertyId, meterId);
    if (!m) throw new NotFoundError("Meter");
    return m;
  }
}

export class ListReadingsUseCase extends Base implements IUseCase<IPropertyScope & { meterId: string; query: IReadingListQuery }, IReadingListResponse> {
  async execute({ actor, propertyId, meterId, query }: IPropertyScope & { meterId: string; query: IReadingListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    await this.meter(propertyId, meterId);
    return this.readings.list(meterId, query);
  }
}

/** Rule: a meter never runs backwards over time (readings are monotonic by time). */
export class CreateReadingUseCase extends Base implements IUseCase<ICreateReadingCommand, IReadingResponse> {
  async execute(c: ICreateReadingCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.field);
    const meter = await this.meter(c.propertyId, c.meterId);
    if (meter.removedAt && c.readOn > meter.removedAt) {
      throw new ValidationError("The meter was removed before this date", { fieldErrors: { readOn: [`Meter removed on ${meter.removedAt}`] } });
    }
    const { prev, next } = await this.readings.neighbours(c.meterId, c.readAt);
    if (prev && c.value < prev.value) {
      throw new ValidationError("Reading is lower than the previous one", { fieldErrors: { value: [`Must be >= ${prev.value} (${prev.readAt})`] } });
    }
    if (next && c.value > next.value) {
      throw new ValidationError("Reading is higher than the next one", { fieldErrors: { value: [`Must be <= ${next.value} (${next.readAt})`] } });
    }
    return this.readings.create(c);
  }
}

export class DeleteReadingUseCase extends Base implements IUseCase<IPropertyScope & { meterId: string; readingId: string }, void> {
  async execute({ actor, propertyId, meterId, readingId }: IPropertyScope & { meterId: string; readingId: string }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    await this.meter(propertyId, meterId);
    if (!(await this.readings.findById(meterId, readingId))) throw new NotFoundError("Reading");
    if (await this.readings.isBilled(readingId)) throw new ConflictError("This reading is used by a billing period", "READING_BILLED");
    await this.readings.softDelete(meterId, readingId);
  }
}
