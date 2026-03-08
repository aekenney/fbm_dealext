import type { ExtensionMessage, MessageResponse } from "~/types";

function handleMessage(
  message: ExtensionMessage,
  _sender: browser.Runtime.MessageSender
): Promise<MessageResponse> | false {
  switch (message.type) {
    case "EXTRACT":
      return Promise.resolve({ ok: true });
    case "GET_EXTRACTED":
    case "SAVE_COMP":
    case "GET_COMPS":
      return Promise.resolve({ ok: true, data: null });
    default:
      return false;
  }
}

export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  browser.runtime.onMessage.addListener(handleMessage);
});
