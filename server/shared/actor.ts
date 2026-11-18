/** The authenticated, registered account performing a request. */
export interface IActor {
  accountId: string;
}

/** Context of every property-scoped (admin) command. */
export interface IPropertyScope {
  actor: IActor;
  propertyId: string;
}
