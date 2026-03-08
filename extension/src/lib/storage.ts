import type { Listing, SavedComp } from "~/types";

const COMPS_KEY = "comps";

export async function getComps(): Promise<SavedComp[]> {
  const result = await browser.storage.local.get(COMPS_KEY);
  return (result[COMPS_KEY] as SavedComp[] | undefined) ?? [];
}

export async function saveComp(listing: Listing): Promise<SavedComp> {
  const comps = await getComps();
  const comp: SavedComp = {
    ...listing,
    id: `${listing.url}-${listing.extractedAt}`,
    savedAt: Date.now(),
  };
  await browser.storage.local.set({ [COMPS_KEY]: [comp, ...comps] });
  return comp;
}

export async function deleteComp(id: string): Promise<void> {
  const comps = await getComps();
  await browser.storage.local.set({
    [COMPS_KEY]: comps.filter((c) => c.id !== id),
  });
}
