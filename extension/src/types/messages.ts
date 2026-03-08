export type MessageType =
  | "EXTRACT"
  | "GET_EXTRACTED"
  | "SAVE_COMP"
  | "GET_COMPS"
  | "LISTING_EXTRACTED"
  | "GET_AI_SUMMARY";

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T | null;
}
