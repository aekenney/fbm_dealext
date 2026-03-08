export type Listing = {
  url: string;
  title: string;
  price: number | null;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  location: string | null;
  description: string | null;
  images: string[];
  extractedAt: number;
};

export type SavedComp = Listing & {
  id: string;
  savedAt: number;
};

export type ScoreLabel = "Deal" | "Fair" | "Overpriced" | "Insufficient data";

export type Score = {
  label: ScoreLabel;
  percentile: number;
  compCount: number;
};
