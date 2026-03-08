import { MARKETPLACE_MATCH_PATTERN } from "~/lib";

export default defineContentScript({
  matches: [MARKETPLACE_MATCH_PATTERN],
  runAt: "document_idle",
  main() {},
});
