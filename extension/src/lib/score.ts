import type { Listing, SavedComp, Score } from "~/types";

const MIN_COMPS = 3;

function normalize(s: string | null): string {
  return (s ?? "").toLowerCase().trim();
}

function relevantComps(listing: Listing, comps: SavedComp[]): SavedComp[] {
  const make = normalize(listing.make);
  const model = normalize(listing.model);

  const byModel = comps.filter(
    (c) =>
      c.price !== null &&
      normalize(c.make) === make &&
      normalize(c.model) === model
  );
  if (byModel.length >= MIN_COMPS) return byModel;

  const byMake = comps.filter(
    (c) => c.price !== null && normalize(c.make) === make
  );
  if (byMake.length >= MIN_COMPS) return byMake;

  return [];
}

function percentileRank(price: number, prices: number[]): number {
  const below = prices.filter((p) => p > price).length;
  return Math.round((below / prices.length) * 100);
}

export function scoreListing(listing: Listing, comps: SavedComp[]): Score {
  const pool = relevantComps(listing, comps);

  if (listing.price === null || pool.length < MIN_COMPS) {
    return { label: "Insufficient data", percentile: 0, compCount: pool.length };
  }

  const prices = pool.map((c) => c.price as number);
  const percentile = percentileRank(listing.price, prices);

  const label =
    percentile >= 67 ? "Deal" : percentile >= 34 ? "Fair" : "Overpriced";

  return { label, percentile, compCount: pool.length };
}
