import type { ExtensionMessage, MessageResponse, Listing } from "~/types";

async function getMarketplaceTabId(): Promise<number | null> {
  const tabs = await browser.tabs.query({ url: "*://www.facebook.com/marketplace/item/*" });
  return tabs[0]?.id ?? null;
}

async function handleExtract(): Promise<MessageResponse<Listing>> {
  const tabId = await getMarketplaceTabId();
  if (tabId === null) return { ok: false, data: null };

  try {
    const response = await browser.tabs.sendMessage(tabId, { type: "EXTRACT" });
    return response as MessageResponse<Listing>;
  } catch {
    return { ok: false, data: null };
  }
}

export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
      switch (message.type) {
        case "EXTRACT":
          handleExtract().then(sendResponse);
          return true;
        case "LISTING_EXTRACTED":
          browser.runtime.sendMessage(message).catch(() => {});
          sendResponse({ ok: true });
          return true;
        case "GET_EXTRACTED":
        case "SAVE_COMP":
        case "GET_COMPS":
          sendResponse({ ok: true, data: null });
          return true;
        default:
          return false;
      }
    }
  );
});
