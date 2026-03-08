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
  extractedAt: number;
};
