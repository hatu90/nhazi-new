import type { IPaginated } from "@/server/shared/pagination";
import type {
  IAddVersionCommand,
  ICreateTemplateCommand,
  ITemplateDetailResponse,
  ITemplateListQuery,
  ITemplateSummaryResponse,
  ITemplateVersionResponse,
  IUpdateTemplateCommand,
} from "./agreement.schema";

export interface IAgreementRepository {
  list(propertyId: string, query: ITemplateListQuery): Promise<IPaginated<ITemplateSummaryResponse>>;
  findById(propertyId: string, templateId: string): Promise<ITemplateDetailResponse | null>;
  findVersion(propertyId: string, templateId: string, version: number): Promise<ITemplateVersionResponse | null>;
  /** Creates version 1; when `isDefault`, clears the flag on the others in the same transaction. */
  create(command: ICreateTemplateCommand): Promise<ITemplateDetailResponse>;
  update(command: IUpdateTemplateCommand): Promise<ITemplateDetailResponse | null>;
  /** Appends version `baseVersion + 1`. ConflictError STALE_VERSION if current != baseVersion. null = no such template. */
  addVersion(command: IAddVersionCommand): Promise<ITemplateDetailResponse | null>;
  softDelete(propertyId: string, templateId: string): Promise<boolean>;
}
