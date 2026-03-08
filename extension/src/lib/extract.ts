import type { Listing } from "~/types";

const PRICE_RE = /\$?([\d,]+)/;
const YEAR_RE = /\b(19[5-9]\d|20[0-2]\d)\b/;
const MILEAGE_K_RE = /(\d+(?:\.\d+)?)\s*[Kk]\s*(?:miles?|mi\b)/i;
const TITLE_YEAR_MAKE_MODEL_RE = /^(\d{4})\s+(\S+)\s+(.+)$/;

function parseIntWithCommas(raw: string): number {
  return parseInt(raw.replace(/,/g, ""), 10);
}

function parsePrice(raw: string): number | null {
  const match = raw.replace(/,/g, "").match(PRICE_RE);
  return match ? parseInt(match[1], 10) : null;
}

function parseMileageText(raw: string): number | null {
  const kMatch = raw.match(MILEAGE_K_RE);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  return null;
}

function compactObject<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) as Partial<T>;
}

function meta(name: string): string | null {
  return (
    document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)?.content ??
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ??
    null
  );
}

// FB CDN type codes that appear in marketplace/uploaded photo URLs
// t45.5328-4 = marketplace photos, t39.1-0 = general uploads
const LISTING_PHOTO_RE = /\/t45\.|\/t39\.|\/t31\./;
// Avatar/profile sizes to skip
const SMALL_SIZE_RE = /p(28|32|40|48|50|60|80|100|120|130|160)x\1/;

function extractImages(): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  // Scope to [role="main"] to exclude chat sidebar, notifications, etc.
  const root: Element = document.querySelector('[role="main"]') ?? document.body;

  const imgs = root.querySelectorAll<HTMLImageElement>("img[src]");
  for (const img of imgs) {
    const src = img.src;
    if (!src) continue;
    if (seen.has(src)) continue;
    if (!src.includes("scontent") && !src.includes("fbcdn")) continue;
    if (SMALL_SIZE_RE.test(src)) continue;
    if (src.includes("emoji")) continue;
    // Require URL to look like an uploaded photo, not a UI asset
    if (!LISTING_PHOTO_RE.test(src)) continue;

    seen.add(src);
    results.push(src);
    if (results.length >= 10) break;
  }

  return results;
}

function extractFromMeta(): Partial<Listing> {
  const title = meta("og:title") ?? undefined;
  const description = (meta("og:description") ?? meta("description")) ?? undefined;
  const mileage = description ? parseMileageText(description) ?? undefined : undefined;
  return compactObject({ title, description, mileage });
}

function extractFromJsonLd(): Partial<Listing> {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      if (data["@type"] === "Product" || data["@type"] === "Vehicle") {
        return compactObject({
          title: data.name ?? null,
          price: data.offers?.price ? parseInt(data.offers.price, 10) : null,
          description: data.description ?? null,
        });
      }
    } catch {
      // malformed script tag — skip
    }
  }
  return {};
}

function extractFromDom(): Partial<Listing> {
  const result: Partial<Listing> = {};

  const allText = document.body.innerText;
  const aboutIdx = allText.indexOf("About this vehicle");
  const sellerDescIdx = allText.indexOf("Seller's description");

  const listingSection = aboutIdx !== -1 ? allText.slice(0, aboutIdx) : allText.slice(0, 500);

  const priceMatch = listingSection.match(/\$([\d,]+)/);
  if (priceMatch) result.price = parsePrice(priceMatch[0]);

  const locationMatch = listingSection.match(/Listed .+ in (.+)/);
  if (locationMatch?.[1]) result.location = locationMatch[1].trim();

  if (aboutIdx !== -1) {
    const vehicleSection = allText.slice(
      aboutIdx,
      sellerDescIdx !== -1 ? sellerDescIdx : aboutIdx + 500
    );
    const drivenMatch = vehicleSection.match(/Driven\s+([\d,]+)\s+miles/i);
    if (drivenMatch?.[1]) result.mileage = parseIntWithCommas(drivenMatch[1]);
  }

  if (sellerDescIdx !== -1) {
    const afterDesc = allText.slice(sellerDescIdx + "Seller's description".length);
    const end = afterDesc.search(/\n(Location is approximate|Seller information|[A-Z][a-zA-Z\s]+, [A-Z]{2})/);
    const raw = end !== -1 ? afterDesc.slice(0, end) : afterDesc;
    const cleaned = raw.replace(/\.\.\. See more$/, "").trim();
    if (cleaned.length > 10) result.description = cleaned;
  }

  return result;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^\(\d+\+?\)\s*/, "")
    .replace(/^Marketplace\s*[-–]\s*/i, "")
    .replace(/\s*\|\s*Facebook\s*$/i, "")
    .trim();
}

function parseTitleFields(title: string): Pick<Listing, "year" | "make" | "model"> {
  const match = title.match(TITLE_YEAR_MAKE_MODEL_RE);
  if (match) {
    return {
      year: parseInt(match[1]!, 10),
      make: match[2] ?? null,
      model: match[3]?.trim() ?? null,
    };
  }
  const year = title.match(YEAR_RE);
  return {
    year: year ? parseInt(year[1]!, 10) : null,
    make: null,
    model: null,
  };
}

export function extractListing(): Listing {
  const dom = extractFromDom();
  const metaTags = extractFromMeta();
  const jsonLd = extractFromJsonLd();

  const merged = { ...dom, ...metaTags, ...jsonLd };
  const title = cleanTitle(merged.title ?? document.title ?? "");
  const { year, make, model } = parseTitleFields(title);

  return {
    url: location.href,
    title,
    price: merged.price ?? null,
    year,
    make,
    model,
    mileage: merged.mileage ?? null,
    location: merged.location ?? null,
    description: merged.description ?? null,
    images: extractImages(),
    extractedAt: Date.now(),
  };
}
