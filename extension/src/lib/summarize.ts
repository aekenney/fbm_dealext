import Anthropic from "@anthropic-ai/sdk";
import type { Listing, SavedComp, Score } from "~/types";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

export type ListingSummary = {
  verdict: string;
  good: string[];
  bad: string[];
  maintenance: string[];
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export async function summarizeListing(
  listing: Listing,
  comps: SavedComp[],
  score: Score
): Promise<ListingSummary> {
  const details = [
    listing.year    && `Year: ${listing.year}`,
    listing.make    && `Make: ${listing.make}`,
    listing.model   && `Model: ${listing.model}`,
    listing.mileage && `Mileage: ${fmt(listing.mileage)} miles`,
    listing.price   !== null && `Asking price: $${fmt(listing.price)}`,
    listing.location && `Location: ${listing.location}`,
  ].filter(Boolean).join("\n");

  // Explain comp context honestly — including whether they're same model or just same make
  const compLines: string[] = comps.map(
    (c) => `  • ${c.year ?? "?"} ${c.make ?? ""} ${c.model ?? ""} — ${c.price !== null ? `$${fmt(c.price)}` : "no price"}${c.mileage ? `, ${fmt(c.mileage)} mi` : ""}`
  );

  const compContext = comps.length === 0
    ? "No saved comparables."
    : `Saved comparables (${score.compCount} used for scoring — may include different trims/models within same make):\n${compLines.join("\n")}\nScore: ${score.label} (cheaper than ${score.percentile}% of comps). Note: if comps are not the same model, treat this percentile as rough context only.`;

  const prompt = `You are an experienced used-car buyer with deep knowledge of current market prices. Analyze this Facebook Marketplace listing and return a JSON object.

Listing:
${details}
${listing.description ? `\nFull seller description:\n${listing.description}` : ""}

Comp data:
${compContext}

Instructions:
- Use YOUR OWN knowledge of current market prices for this specific make/model/trim/year/mileage to assess whether the asking price is fair. Do not rely solely on comp data if the comps appear to be different vehicles.
- "verdict": one direct sentence — is this a good deal vs real market? Include your estimated fair market range if you know it.
- "good": array of 2-3 full sentences, specific positives about this listing
- "bad": array of 1-3 full sentences, specific concerns or red flags (include price vs real market if overpriced)
- "maintenance": array of 2-3 full sentences describing common issues or maintenance items owners of this specific make/model typically face around this mileage — be specific to this vehicle, not generic advice

Return ONLY valid JSON, no markdown, no extra text.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") throw new Error("Unexpected response type");

  const raw = block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(raw) as ListingSummary;
  return parsed;
}
