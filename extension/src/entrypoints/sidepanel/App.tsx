import { useState, useEffect } from "react";
import type { Listing, MessageResponse, MessageType, SavedComp, Score } from "~/types";
import { EXTENSION_NAME, scoreListing } from "~/lib";
import type { ListingSummary } from "~/lib/summarize";

type View = "listing" | "comps";

type ListingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; listing: Listing }
  | { status: "error" };

type SaveState = "idle" | "saving" | "saved" | "error";

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; summary: ListingSummary }
  | { status: "error"; message: string };

// ─── Design tokens (exact Facebook Marketplace values) ───────────────────────
const T = {
  bg: "#F0F2F5",
  surface: "#fff",
  border: "#E4E6EB",
  textPrimary: "#1C1E21",
  textSecondary: "#65676B",
  textMuted: "#BCC0C4",
  blue: "#1877F2",
  blueLight: "#E7F3FF",
  green: "#1e7e34",
  red: "#c0392b",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
} as const;

const card: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// ─── Reusable primitives ─────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: T.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: T.textSecondary, fontSize: 12 }}>{label}</span>
      <span style={{ color: T.textPrimary, fontSize: 15, fontWeight: 600 }}>{value ?? "—"}</span>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children, green }: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  green?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: green ? "#42b72a" : T.blue,
        border: "none",
        borderRadius: 6,
        color: "#fff",
        cursor: disabled ? "default" : "pointer",
        fontSize: 15,
        fontWeight: 600,
        opacity: disabled ? 0.7 : 1,
        padding: "10px 0",
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: T.blueLight,
        border: "none",
        borderRadius: 6,
        color: T.blue,
        cursor: "pointer",
        fontSize: 15,
        fontWeight: 600,
        padding: "10px 0",
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}

function Spinner({ label = "Analyzing listing…" }: { label?: string }) {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0" }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: `3px solid ${T.border}`,
          borderTopColor: T.blue,
          animation: "_spin 0.8s linear infinite",
        }} />
        <p style={{ color: T.textSecondary, fontSize: 13 }}>{label}</p>
      </div>
    </>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "64px 24px 0", textAlign: "center" }}>
      <p style={{ color: T.textPrimary, fontSize: 16, fontWeight: 600 }}>{title}</p>
      <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{body}</p>
      {action}
    </div>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────

const SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  Deal:               { bg: "#e6f4ea", text: "#1e7e34" },
  Fair:               { bg: "#fff8e1", text: "#b45309" },
  Overpriced:         { bg: "#fdecea", text: "#c0392b" },
  "Insufficient data":{ bg: T.bg,     text: T.textSecondary },
};

function ScoreBadge({ score }: { score: Score }) {
  const colors = SCORE_COLORS[score.label] ?? { bg: T.bg, text: T.textSecondary };
  const sub = score.label === "Insufficient data"
    ? score.compCount < 3
      ? `need ${3 - score.compCount} more comp${3 - score.compCount === 1 ? "" : "s"}`
      : "no price to compare"
    : `cheaper than ${score.percentile}% of ${score.compCount} comps`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{
        background: colors.bg,
        borderRadius: 6,
        color: colors.text,
        fontSize: 13,
        fontWeight: 700,
        padding: "3px 10px",
      }}>
        {score.label}
      </span>
      <span style={{ color: T.textSecondary, fontSize: 12 }}>{sub}</span>
    </div>
  );
}

// ─── AI Summary card ─────────────────────────────────────────────────────────

type SummarySection = {
  items: string[];
  color: string;
  icon: string;
  heading: string;
};

function SummaryCard({ summary }: { summary: ListingSummary }) {
  const sections: SummarySection[] = [
    { heading: "Good",        items: summary.good,        color: T.green,        icon: "✓" },
    { heading: "Concerns",    items: summary.bad,         color: T.red,          icon: "✗" },
    { heading: "Maintenance", items: summary.maintenance, color: "#b45309",      icon: "!" },
  ].filter((s) => s.items.length > 0);

  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <Label>✦ AI Summary</Label>
      <p style={{ color: T.textPrimary, fontSize: 14, lineHeight: 1.55, marginBottom: sections.length ? 12 : 0 }}>
        {summary.verdict}
      </p>
      {sections.map((s, si) => (
        <div key={s.heading} style={{ marginBottom: si < sections.length - 1 ? 10 : 0 }}>
          <p style={{ color: s.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            {s.heading}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {s.items.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: s.color, fontSize: 13, lineHeight: "19px", flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
                <span style={{ color: T.textPrimary, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Listing card ────────────────────────────────────────────────────────────

type ListingCardProps = {
  listing: Listing;
  score: Score;
  onReanalyze: () => void;
  onSave: () => void;
  saveState: SaveState;
  summaryState: SummaryState;
  onSummarize: () => void;
};

function ListingCard({ listing, score, onReanalyze, onSave, saveState, summaryState, onSummarize }: ListingCardProps) {
  const fields: { label: string; value: string | null }[] = [
    { label: "Year",    value: listing.year    ? String(listing.year)          : null },
    { label: "Make",    value: listing.make },
    { label: "Model",   value: listing.model },
    { label: "Mileage", value: listing.mileage ? `${fmt(listing.mileage)} mi`  : null },
  ];

  const saveLabel =
    saveState === "saving" ? "Saving…" :
    saveState === "saved"  ? "✓ Saved" :
    saveState === "error"  ? "Failed"  : "Save as Comp";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Main listing info */}
      <div style={{ ...card, padding: "14px 16px" }}>
        <p style={{ color: T.textPrimary, fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
          {listing.title}
        </p>
        <p style={{ color: T.textPrimary, fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
          {listing.price !== null ? `$${fmt(listing.price)}` : "—"}
        </p>
        <ScoreBadge score={score} />
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {fields.map(({ label, value }) => (
            <Field key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {/* Location */}
      {listing.location && (
        <div style={{ ...card, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ color: T.textPrimary, fontSize: 14 }}>{listing.location}</span>
        </div>
      )}

      {/* Description */}
      {listing.description && (
        <div style={{ ...card, padding: "14px 16px" }}>
          <Label>Description</Label>
          <p style={{ color: T.textPrimary, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-line" }}>
            {listing.description}
          </p>
        </div>
      )}

      {/* AI Summary */}
      {summaryState.status === "idle" && (
        <SecondaryBtn onClick={onSummarize}>✦ AI Summary</SecondaryBtn>
      )}
      {summaryState.status === "loading" && (
        <Spinner label="Generating summary…" />
      )}
      {summaryState.status === "loaded" && (
        <SummaryCard summary={summaryState.summary} />
      )}
      {summaryState.status === "error" && (
        <div style={{ ...card, padding: "12px 16px", borderLeft: `3px solid ${T.red}` }}>
          <p style={{ color: T.red, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Summary failed</p>
          <p style={{ color: T.textSecondary, fontSize: 12, wordBreak: "break-all", marginBottom: 8 }}>{summaryState.message}</p>
          <SecondaryBtn onClick={onSummarize}>Retry</SecondaryBtn>
        </div>
      )}

      {/* Timestamp */}
      <p style={{ color: T.textMuted, fontSize: 11, textAlign: "center" }}>
        Extracted {new Date(listing.extractedAt).toLocaleTimeString()}
      </p>

      {/* Actions */}
      <PrimaryBtn
        onClick={onSave}
        disabled={saveState === "saving" || saveState === "saved"}
        green={saveState === "saved"}
      >
        {saveLabel}
      </PrimaryBtn>
      <SecondaryBtn onClick={onReanalyze}>Re-analyze</SecondaryBtn>
    </div>
  );
}

// ─── Comps view ──────────────────────────────────────────────────────────────

function CompRow({ comp, onDelete }: { comp: SavedComp; onDelete: (id: string) => void }) {
  return (
    <div style={{ ...card, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: T.textPrimary, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {comp.title}
        </p>
        <p style={{ color: T.textSecondary, fontSize: 12, marginTop: 2 }}>
          {comp.price !== null ? `$${fmt(comp.price)}` : "—"}
          {comp.mileage  ? ` · ${fmt(comp.mileage)} mi`  : ""}
          {comp.location ? ` · ${comp.location}`          : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(comp.id)}
        style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}
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
      <EmptyState
        title="No comps saved yet"
        body={'Analyze a listing and click "Save as Comp" to add one'}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ color: T.textSecondary, fontSize: 12, marginBottom: 2 }}>
        {comps.length} saved {comps.length === 1 ? "comp" : "comps"}
      </p>
      {comps.map((comp) => (
        <CompRow key={comp.id} comp={comp} onDelete={handleDelete} />
      ))}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView]                 = useState<View>("listing");
  const [listingState, setListingState] = useState<ListingState>({ status: "idle" });
  const [saveState, setSaveState]       = useState<SaveState>("idle");
  const [comps, setComps]               = useState<SavedComp[]>([]);
  const [summaryState, setSummaryState] = useState<SummaryState>({ status: "idle" });

  useEffect(() => {
    browser.runtime.sendMessage({ type: "GET_COMPS" }).then((res: MessageResponse<SavedComp[]>) => {
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
    setSummaryState({ status: "idle" });
    try {
      const res = (await browser.runtime.sendMessage({ type: "EXTRACT" })) as MessageResponse<Listing>;
      if (res.ok && res.data) {
        setListingState({ status: "loaded", listing: res.data });
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
      const res = (await browser.runtime.sendMessage({
        type: "SAVE_COMP",
        payload: listingState.listing,
      })) as MessageResponse<SavedComp>;
      if (res.ok && res.data) {
        setComps((prev) => [res.data as SavedComp, ...prev]);
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  async function handleSummarize() {
    if (listingState.status !== "loaded") return;
    setSummaryState({ status: "loading" });
    try {
      const res = (await browser.runtime.sendMessage({
        type: "GET_AI_SUMMARY",
        payload: { listing: listingState.listing, comps },
      })) as { ok: boolean; data: ListingSummary | null; error?: string };
      if (res.ok && res.data) {
        setSummaryState({ status: "loaded", summary: res.data });
      } else {
        setSummaryState({ status: "error", message: res.error ?? "Unknown error" });
      }
    } catch (err) {
      setSummaryState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, fontFamily: T.font }}>

      {/* Header */}
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🚗
          </div>
          <span style={{ color: T.textPrimary, fontSize: 16, fontWeight: 700 }}>{EXTENSION_NAME}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["listing", "comps"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                background: view === v ? T.blueLight : "transparent",
                border: "none",
                borderRadius: 6,
                color: view === v ? T.blue : T.textSecondary,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                padding: "5px 12px",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {view === "comps" ? (
          <CompsView />
        ) : (
          <>
            {listingState.status === "idle" && (
              <EmptyState
                title="No listing loaded"
                body={"Open a Facebook Marketplace vehicle listing to get started"}
                action={
                  <button
                    type="button"
                    onClick={analyze}
                    style={{ background: T.blue, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600, marginTop: 4, padding: "8px 24px" }}
                  >
                    Analyze Listing
                  </button>
                }
              />
            )}

            {listingState.status === "loading" && <Spinner />}

            {listingState.status === "loaded" && (
              <ListingCard
                listing={listingState.listing}
                score={scoreListing(listingState.listing, comps)}
                onReanalyze={analyze}
                onSave={handleSave}
                saveState={saveState}
                summaryState={summaryState}
                onSummarize={handleSummarize}
              />
            )}

            {listingState.status === "error" && (
              <EmptyState
                title="Extraction failed"
                body={"Make sure you're on a Facebook Marketplace vehicle listing"}
                action={
                  <button
                    type="button"
                    onClick={analyze}
                    style={{ background: T.blueLight, border: "none", borderRadius: 6, color: T.blue, cursor: "pointer", fontSize: 15, fontWeight: 600, marginTop: 4, padding: "8px 24px" }}
                  >
                    Try Again
                  </button>
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
