import type { ExtensionMessage, MessageResponse, Listing, SavedComp } from "~/types";
import { saveComp, getComps } from "~/lib/storage";
import { summarizeListing } from "~/lib/summarize";
import { scoreListing } from "~/lib/score";

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
        case "SAVE_COMP":
          saveComp(message.payload as Listing)
            .then((comp) => sendResponse({ ok: true, data: comp }))
            .catch(() => sendResponse({ ok: false, data: null }));
          return true;
        case "GET_COMPS":
          getComps()
            .then((comps) => sendResponse({ ok: true, data: comps }))
            .catch(() => sendResponse({ ok: false, data: [] }));
          return true;
        case "GET_EXTRACTED":
          sendResponse({ ok: true, data: null });
          return true;
        case "GET_AI_SUMMARY": {
          const { listing, comps } = message.payload as { listing: Listing; comps: SavedComp[] };
          const score = scoreListing(listing, comps);
          summarizeListing(listing, comps, score)
            .then((summary) => sendResponse({ ok: true, data: summary }))
            .catch((err: unknown) => {
              console.error("[DealExt] summarize error:", err);
              const msg = err instanceof Error ? err.message : String(err);
              sendResponse({ ok: false, data: null, error: msg });
            });
          return true;
        }
        default:
          return false;
      }
    }
  );
});
