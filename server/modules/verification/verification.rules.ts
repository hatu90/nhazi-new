import type { VerificationStatus } from "./verification.schema";

/**
 * The status shown to everyone. `verified` = an open result that has not lapsed; `registered` = at least one live declaration
 * (declared / confirmed on an active criterion); otherwise `none`. Checked against the clock, so a lapsed result never
 * shows as verified while waiting for the daily job to close it.
 */
export const deriveStatus = (openResultExpiresAt: Date | null, hasDeclaration: boolean, now = new Date()): VerificationStatus =>
  openResultExpiresAt && openResultExpiresAt > now ? "verified" : hasDeclaration ? "registered" : "none";
