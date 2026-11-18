import type { IPropertyScope } from "@/server/shared/actor";
import { NotFoundError } from "@/server/shared/errors";
import type { IUseCase } from "@/server/shared/usecase";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IAgreementRepository } from "./agreement.repository";
import type {
  IAddVersionCommand,
  ICreateTemplateCommand,
  ITemplateDetailResponse,
  ITemplateListQuery,
  ITemplateListResponse,
  ITemplateVersionResponse,
  IUpdateTemplateCommand,
} from "./agreement.schema";

type Tpl = { templateId: string };
abstract class Base {
  constructor(protected readonly templates: IAgreementRepository, protected readonly policy: AccessPolicy) {}
}

export class ListTemplatesUseCase extends Base implements IUseCase<IPropertyScope & { query: ITemplateListQuery }, ITemplateListResponse> {
  async execute({ actor, propertyId, query }: IPropertyScope & { query: ITemplateListQuery }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    return this.templates.list(propertyId, query);
  }
}
export class GetTemplateUseCase extends Base implements IUseCase<IPropertyScope & Tpl, ITemplateDetailResponse> {
  async execute({ actor, propertyId, templateId }: IPropertyScope & Tpl) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const t = await this.templates.findById(propertyId, templateId);
    if (!t) throw new NotFoundError("Agreement template");
    return t;
  }
}
export class GetTemplateVersionUseCase extends Base implements IUseCase<IPropertyScope & Tpl & { version: number }, ITemplateVersionResponse> {
  async execute({ actor, propertyId, templateId, version }: IPropertyScope & Tpl & { version: number }) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.read);
    const v = await this.templates.findVersion(propertyId, templateId, version);
    if (!v) throw new NotFoundError("Template version");
    return v;
  }
}
export class CreateTemplateUseCase extends Base implements IUseCase<ICreateTemplateCommand, ITemplateDetailResponse> {
  async execute(c: ICreateTemplateCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    return this.templates.create(c);
  }
}
export class UpdateTemplateUseCase extends Base implements IUseCase<IUpdateTemplateCommand, ITemplateDetailResponse> {
  async execute(c: IUpdateTemplateCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const t = await this.templates.update(c);
    if (!t) throw new NotFoundError("Agreement template");
    return t;
  }
}
export class AddTemplateVersionUseCase extends Base implements IUseCase<IAddVersionCommand, ITemplateDetailResponse> {
  async execute(c: IAddVersionCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const t = await this.templates.addVersion(c);
    if (!t) throw new NotFoundError("Agreement template");
    return t;
  }
}
export class DeleteTemplateUseCase extends Base implements IUseCase<IPropertyScope & Tpl, void> {
  async execute({ actor, propertyId, templateId }: IPropertyScope & Tpl) {
    await this.policy.assertPropertyRole(actor, propertyId, ROLES.manage);
    if (!(await this.templates.softDelete(propertyId, templateId))) throw new NotFoundError("Agreement template");
  }
}
