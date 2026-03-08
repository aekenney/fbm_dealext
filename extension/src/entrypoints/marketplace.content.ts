import { MARKETPLACE_MATCH_PATTERN } from "~/lib";
import { extractListing } from "~/lib/extract";
import type { ExtensionMessage, Listing } from "~/types";

const MARKETPLACE_ITEM_RE = /\/marketplace\/item\//;
const SETTLE_DELAY_MS = 1500;

function push(listing: Listing) {
  browser.runtime.sendMessage({ type: "LISTING_EXTRACTED", payload: listing }).catch(() => {});
}

function extractAndPush() {
  push(extractListing());
}

function watchForNavigation() {
  const original = history.pushState.bind(history);
  history.pushState = (...args) => {
    original(...args);
    if (MARKETPLACE_ITEM_RE.test(location.href)) {
      setTimeout(extractAndPush, SETTLE_DELAY_MS);
    }
  };
  window.addEventListener("popstate", () => {
    if (MARKETPLACE_ITEM_RE.test(location.href)) {
      setTimeout(extractAndPush, SETTLE_DELAY_MS);
    }
  });
}

export default defineContentScript({
  matches: [MARKETPLACE_MATCH_PATTERN],
  runAt: "document_idle",
  main() {
    setTimeout(extractAndPush, SETTLE_DELAY_MS);
    watchForNavigation();

    browser.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        if (message.type !== "EXTRACT") return false;
        sendResponse({ ok: true, data: extractListing() });
        return true;
      }
    );
  },
});
