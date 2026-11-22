export interface IPushMessage {
  title: string;
  body: string;
  /** Flat string map (FCM data payload). */
  data: Record<string, string>;
}

/** Sends one message to many device tokens (FCM). Resolves with the tokens that are no longer valid. */
export interface IPushSender {
  send(tokens: string[], message: IPushMessage): Promise<{ invalidTokens: string[] }>;
}
