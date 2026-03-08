import { useState, useEffect } from "react";
import type { Listing, MessageResponse, MessageType, SavedComp, Score } from "~/types";
import { EXTENSION_NAME, scoreListing } from "~/lib";

type View = "listing" | "comps";

type ListingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; listing: Listing }
  | { status: "error" };

type SaveState = "idle" | "saving" | "saved" | "error";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E6EB",
  borderRadius: 8,
  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
};

const fbBtn = (primary: boolean): React.CSSProperties => ({
  background: primary ? "#1877F2" : "#E7F3FF",
  border: "none",
  borderRadius: 6,
  color: primary ? "#fff" : "#1877F2",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  padding: "8px 0",
  width: "100%",
});

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ color: "#65676B", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#1C1E21", fontSize: 15, fontWeight: 600 }}>{value ?? "—"}</span>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 64, textAlign: "center" }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E4E6EB", borderTopColor: "#1877F2", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#65676B", fontSize: 13 }}>Analyzing listing…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  Deal:               { bg: "#e6f4ea", text: "#1e7e34" },
  Fair:               { bg: "#fff8e1", text: "#b45309" },
  Overpriced:         { bg: "#fdecea", text: "#c0392b" },
  "Insufficient data":{ bg: "#f0f2f5", text: "#65676b" },
};

function ScoreBadge({ score }: { score: Score }) {
  const colors = SCORE_COLORS[score.label];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          background: colors.bg,
          borderRadius: 6,
          color: colors.text,
          fontSize: 13,
          fontWeight: 700,
          padding: "4px 10px",
        }}
      >
        {score.label}
      </span>
      {score.label !== "Insufficient data" && (
        <span style={{ color: "#65676B", fontSize: 12 }}>
          cheaper than {score.percentile}% of {score.compCount} comps
        </span>
      )}
      {score.label === "Insufficient data" && (
        <span style={{ color: "#65676B", fontSize: 12 }}>
          {score.compCount < 3
            ? `need ${3 - score.compCount} more comp${3 - score.compCount === 1 ? "" : "s"}`
            : "no price to compare"}
        </span>
      )}
    </div>
  );
}

type ListingCardProps = {
  listing: Listing;
  score: Score;
  onReanalyze: () => void;
  onSave: () => void;
  saveState: SaveState;
};

function ListingCard({ listing, score, onReanalyze, onSave, saveState }: ListingCardProps) {
  const fields: { label: string; value: string | null }[] = [
    { label: "Year", value: listing.year ? String(listing.year) : null },
    { label: "Make", value: listing.make },
    { label: "Model", value: listing.model },
    { label: "Mileage", value: listing.mileage ? `${fmt(listing.mileage)} mi` : null },
  ];

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : saveState === "error" ? "Failed" : "Save as Comp";

  return (
    <div className="flex flex-col gap-3">
      <div style={{ ...card, padding: "12px 16px" }}>
        <p style={{ color: "#1C1E21", fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
          {listing.title}
        </p>
        <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          {listing.price !== null ? `$${fmt(listing.price)}` : "—"}
        </p>
        <div style={{ marginBottom: 12 }}>
          <ScoreBadge score={score} />
        </div>
        <div style={{ borderTop: "1px solid #E4E6EB", paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          {fields.map(({ label, value }) => (
            <Field key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {listing.location && (
        <div style={{ ...card, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, color: "#1C1E21", fontSize: 14 }}>
          <span style={{ color: "#65676B" }}>📍</span>
          {listing.location}
        </div>
      )}

      {listing.description && (
        <div style={{ ...card, padding: "12px 16px" }}>
          <p style={{ color: "#65676B", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description</p>
          <p style={{ color: "#1C1E21", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-line" }}>
            {listing.description}
          </p>
        </div>
      )}

      <p style={{ color: "#BCC0C4", fontSize: 11, textAlign: "center" }}>
        Extracted {new Date(listing.extractedAt).toLocaleTimeString()}
      </p>

      <button
        type="button"
        onClick={onSave}
        disabled={saveState === "saving" || saveState === "saved"}
        style={{
          ...fbBtn(true),
          opacity: saveState === "saving" || saveState === "saved" ? 0.7 : 1,
          background: saveState === "saved" ? "#42b72a" : "#1877F2",
        }}
      >
        {saveLabel}
      </button>

      <button type="button" onClick={onReanalyze} style={fbBtn(false)}>
        Re-analyze
      </button>
    </div>
  );
}

function CompRow({ comp, onDelete }: { comp: SavedComp; onDelete: (id: string) => void }) {
  return (
    <div style={{ ...card, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#1C1E21", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {comp.title}
        </p>
        <p style={{ color: "#65676B", fontSize: 12, marginTop: 2 }}>
          {comp.price !== null ? `$${fmt(comp.price)}` : "—"}
          {comp.mileage ? ` · ${fmt(comp.mileage)} mi` : ""}
          {comp.location ? ` · ${comp.location}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(comp.id)}
        style={{ background: "none", border: "none", color: "#BCC0C4", cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

function CompsView() {
  const [comps, setComps] = useState<SavedComp[]>([]);

  useEffect(() => {
    browser.runtime.sendMessage({ type: "GET_COMPS" }).then((res: MessageResponse<SavedComp[]>) => {
      if (res.ok && res.data) setComps(res.data);
    });
  }, []);

  async function handleDelete(id: string) {
    const { deleteComp } = await import("~/lib/storage");
    await deleteComp(id);
    setComps((prev) => prev.filter((c) => c.id !== id));
  }

  if (comps.length === 0) {
    return (
      <CenteredMessage>
        <p style={{ color: "#1C1E21", fontSize: 16, fontWeight: 600 }}>No comps saved yet</p>
        <p style={{ color: "#65676B", fontSize: 14, lineHeight: 1.5 }}>
          Analyze a listing and click
          <br />
          "Save as Comp" to add one
        </p>
      </CenteredMessage>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p style={{ color: "#65676B", fontSize: 12, marginBottom: 4 }}>
        {comps.length} saved {comps.length === 1 ? "comp" : "comps"}
      </p>
      {comps.map((comp) => (
        <CompRow key={comp.id} comp={comp} onDelete={handleDelete} />
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("listing");
  const [listingState, setListingState] = useState<ListingState>({ status: "idle" });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [comps, setComps] = useState<SavedComp[]>([]);

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: "GET_COMPS" })
      .then((res: MessageResponse<SavedComp[]>) => {
        if (res.ok && res.data) setComps(res.data);
      });
  }, []);

  useEffect(() => {
    const listener = (message: { type: MessageType; payload?: Listing }) => {
      if (message.type === "LISTING_EXTRACTED" && message.payload) {
        setListingState({ status: "loaded", listing: message.payload });
        setSaveState("idle");
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  async function analyze() {
    setListingState({ status: "loading" });
    setSaveState("idle");
    try {
      const response = (await browser.runtime.sendMessage({ type: "EXTRACT" })) as MessageResponse<Listing>;
      if (response.ok && response.data) {
        setListingState({ status: "loaded", listing: response.data });
      } else {
        setListingState({ status: "error" });
      }
    } catch {
      setListingState({ status: "error" });
    }
  }

  async function handleSave() {
    if (listingState.status !== "loaded") return;
    setSaveState("saving");
    try {
      const response = (await browser.runtime.sendMessage({
        type: "SAVE_COMP",
        payload: listingState.listing,
      })) as MessageResponse<SavedComp>;
      if (response.ok && response.data) {
        setComps((prev) => [response.data as SavedComp, ...prev]);
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F0F2F5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #E4E6EB", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🚗
          </div>
          <span style={{ color: "#1C1E21", fontSize: 16, fontWeight: 700 }}>{EXTENSION_NAME}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["listing", "comps"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                background: view === v ? "#E7F3FF" : "none",
                border: "none",
                borderRadius: 6,
                color: view === v ? "#1877F2" : "#65676B",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                padding: "4px 10px",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {view === "comps" ? (
          <CompsView />
        ) : (
          <>
            {listingState.status === "idle" && (
              <CenteredMessage>
                <p style={{ color: "#1C1E21", fontSize: 16, fontWeight: 600 }}>No listing loaded</p>
                <p style={{ color: "#65676B", fontSize: 14, lineHeight: 1.5 }}>
                  Open a Facebook Marketplace
                  <br />
                  vehicle listing to get started
                </p>
                <button type="button" onClick={analyze} style={{ ...fbBtn(true), width: "auto", marginTop: 8, padding: "8px 24px" }}>
                  Analyze Listing
                </button>
              </CenteredMessage>
            )}

            {listingState.status === "loading" && <Spinner />}

            {listingState.status === "loaded" && (
              <ListingCard
                listing={listingState.listing}
                score={scoreListing(listingState.listing, comps)}
                onReanalyze={analyze}
                onSave={handleSave}
                saveState={saveState}
              />
            )}

            {listingState.status === "error" && (
              <CenteredMessage>
                <p style={{ color: "#1C1E21", fontSize: 16, fontWeight: 600 }}>Extraction failed</p>
                <p style={{ color: "#65676B", fontSize: 14, lineHeight: 1.5 }}>
                  Make sure you're on a Facebook
                  <br />
                  Marketplace vehicle listing
                </p>
                <button type="button" onClick={analyze} style={{ ...fbBtn(false), width: "auto", marginTop: 8, padding: "8px 24px" }}>
                  Try Again
                </button>
              </CenteredMessage>
            )}
          </>
        )}
      </main>
    </div>
  );
}
