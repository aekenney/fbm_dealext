export type MessageType =
  | "EXTRACT"
  | "GET_EXTRACTED"
  | "SAVE_COMP"
  | "GET_COMPS";

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T | null;
}
