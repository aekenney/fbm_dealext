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

// ─── Design tokens ────────────────────────────────────────────────────────────
// Change fonts, colors, and sizes here — everything references these values.

const T = {
  // Colors
  bg:            "#F0F2F5",
  surface:       "#fff",
  border:        "#E4E6EB",
  textPrimary:   "#1C1E21",
  textSecondary: "#65676B",
  textMuted:     "#BCC0C4",
  blue:          "#0866FF",
  blueLight:     "#E7F3FF",
  green:         "#1e7e34",
  greenBtn:      "#42b72a",
  red:           "#c0392b",
  amber:         "#b45309",
  overlay:       "rgba(0,0,0,0.45)",
  black:         "#000",
  white:         "#fff",

  // Score colors (bg + text per label)
  scoreDeal:      { bg: "#e6f4ea", text: "#1e7e34" },
  scoreFair:      { bg: "#fff8e1", text: "#b45309" },
  scoreOver:      { bg: "#fdecea", text: "#c0392b" },
  scoreInsuff:    { bg: "#F0F2F5", text: "#65676B" },

  // Typography
  font:    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  sz11:    11,
  sz12:    12,
  sz13:    13,
  sz14:    14,
  sz15:    15,
  sz16:    16,
  sz17:    17,
  sz26:    26,  // price display

  // Spacing
  pad:     "14px 16px",  // standard card padding
  padSm:   "10px 14px",  // compact card padding
  gap:     10,           // default stack gap
  gapSm:   8,            // tight gap
  gapXs:   5,            // item gap in lists
  radius:  8,            // card radius
  radiusSm: 6,           // button / badge radius
} as const;

// ─── Stable style constants (defined once, not recreated per render) ──────────

const S = {
  card: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
  } as React.CSSProperties,

  col: {
    display: "flex", flexDirection: "column",
  } as React.CSSProperties,

  row: {
    display: "flex", alignItems: "center",
  } as React.CSSProperties,

  btnBase: {
    border: "none",
    borderRadius: T.radiusSm,
    cursor: "pointer",
    fontSize: T.sz15,
    fontWeight: 600,
    padding: "10px 0",
    width: "100%",
  } as React.CSSProperties,

  btnPrimary: {
    border: "none",
    borderRadius: T.radiusSm,
    cursor: "pointer",
    fontSize: T.sz15,
    fontWeight: 600,
    padding: "10px 0",
    width: "100%",
    background: T.blue,
    color: T.white,
  } as React.CSSProperties,

  btnSecondary: {
    border: "none",
    borderRadius: T.radiusSm,
    cursor: "pointer",
    fontSize: T.sz15,
    fontWeight: 600,
    padding: "10px 0",
    width: "100%",
    background: T.blueLight,
    color: T.blue,
  } as React.CSSProperties,

  labelText: {
    color: T.textSecondary,
    fontSize: T.sz12,
    fontWeight: 600,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  } as React.CSSProperties,

  fieldLabel: {
    color: T.textSecondary,
    fontSize: T.sz12,
  } as React.CSSProperties,

  fieldValue: {
    color: T.textPrimary,
    fontSize: T.sz15,
    fontWeight: 600,
  } as React.CSSProperties,

  carouselBtn: {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    background: T.overlay,
    border: "none",
    borderRadius: "50%",
    color: T.white,
    cursor: "pointer",
    fontSize: T.sz16,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  carouselCounter: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    background: T.overlay,
    borderRadius: 4,
    color: T.white,
    fontSize: T.sz11,
    fontWeight: 600,
    padding: "2px 6px",
  } as React.CSSProperties,

  spinnerRing: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: `3px solid ${T.border}`,
    borderTopColor: T.blue,
    animation: "_spin 0.8s linear infinite",
  } as React.CSSProperties,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// ─── Primitive components ─────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p style={S.labelText}>{children}</p>;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ ...S.col, gap: 2 }}>
      <span style={S.fieldLabel}>{label}</span>
      <span style={S.fieldValue}>{value ?? "—"}</span>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children, saved }: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  saved?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...S.btnPrimary, background: saved ? T.greenBtn : T.blue, opacity: disabled ? 0.7 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={S.btnSecondary}>{children}</button>;
}

function Spinner({ label = "Analyzing listing…" }: { label?: string }) {
  return (
    <>
      <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ ...S.col, alignItems: "center", gap: 12, padding: "48px 0" }}>
        <div style={S.spinnerRing} />
        <p style={{ color: T.textSecondary, fontSize: T.sz13 }}>{label}</p>
      </div>
    </>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ ...S.col, alignItems: "center", gap: 12, padding: "64px 24px 0", textAlign: "center" }}>
      <p style={{ color: T.textPrimary, fontSize: T.sz16, fontWeight: 600 }}>{title}</p>
      <p style={{ color: T.textSecondary, fontSize: T.sz14, lineHeight: 1.5 }}>{body}</p>
      {action}
    </div>
  );
}

// ─── Image carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;

  return (
    <div style={{ position: "relative", borderRadius: T.radius, overflow: "hidden", background: T.black, aspectRatio: "4/3" }}>
      <img src={images[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)} style={{ ...S.carouselBtn, left: 8 }}>‹</button>
          <button type="button" onClick={() => setIdx((i) => (i + 1) % images.length)} style={{ ...S.carouselBtn, right: 8 }}>›</button>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? T.white : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.15s" }}
              />
            ))}
          </div>
        </>
      )}
      <div style={S.carouselCounter}>{idx + 1} / {images.length}</div>
    </div>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────

const SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  Deal:               T.scoreDeal,
  Fair:               T.scoreFair,
  Overpriced:         T.scoreOver,
  "Insufficient data":T.scoreInsuff,
};

function ScoreBadge({ score }: { score: Score }) {
  const colors = SCORE_COLORS[score.label] ?? T.scoreInsuff;
  const sub = score.label === "Insufficient data"
    ? score.compCount < 3
      ? `need ${3 - score.compCount} more comp${3 - score.compCount === 1 ? "" : "s"}`
      : "no price to compare"
    : `cheaper than ${score.percentile}% of ${score.compCount} comps`;

  return (
    <div style={{ ...S.row, gap: 8, flexWrap: "wrap" }}>
      <span style={{ background: colors.bg, borderRadius: T.radiusSm, color: colors.text, fontSize: T.sz13, fontWeight: 700, padding: "3px 10px" }}>
        {score.label}
      </span>
      <span style={{ color: T.textSecondary, fontSize: T.sz12 }}>{sub}</span>
    </div>
  );
}

// ─── AI Summary card ──────────────────────────────────────────────────────────

const SUMMARY_SECTIONS = [
  { key: "good" as const,        heading: "Good",        color: T.green, icon: "✓" },
  { key: "bad" as const,         heading: "Concerns",    color: T.red,   icon: "✗" },
  { key: "maintenance" as const, heading: "Maintenance", color: T.amber, icon: "!" },
] as const;

function SummaryCard({ summary }: { summary: ListingSummary }) {
  const sections = SUMMARY_SECTIONS.filter((s) => summary[s.key].length > 0);

  return (
    <div style={{ ...S.card, padding: T.pad }}>
      <Label>✦ AI Summary</Label>
      <p style={{ color: T.textPrimary, fontSize: T.sz14, lineHeight: 1.55, marginBottom: sections.length ? 12 : 0 }}>
        {summary.verdict}
      </p>
      {sections.map((s, si) => (
        <div key={s.key} style={{ marginBottom: si < sections.length - 1 ? T.gap : 0 }}>
          <p style={{ color: s.color, fontSize: T.sz11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            {s.heading}
          </p>
          <div style={{ ...S.col, gap: T.gapXs }}>
            {summary[s.key].map((item, i) => (
              <div key={i} style={{ ...S.row, alignItems: "flex-start", gap: T.gapSm }}>
                <span style={{ color: s.color, fontSize: T.sz13, lineHeight: "19px", flexShrink: 0, fontWeight: 700 }}>{s.icon}</span>
                <span style={{ color: T.textPrimary, fontSize: T.sz13, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────

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
    { label: "Year",    value: listing.year    ? String(listing.year)         : null },
    { label: "Make",    value: listing.make },
    { label: "Model",   value: listing.model },
    { label: "Mileage", value: listing.mileage ? `${fmt(listing.mileage)} mi` : null },
  ];

  const saveLabel =
    saveState === "saving" ? "Saving…" :
    saveState === "saved"  ? "✓ Saved" :
    saveState === "error"  ? "Failed"  : "Save as Comp";

  return (
    <div style={{ ...S.col, gap: T.gap }}>
      {listing.images.length > 0 && <ImageCarousel images={listing.images} />}

      <div style={{ ...S.card, padding: T.pad }}>
        <p style={{ color: T.textPrimary, fontSize: T.sz17, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>{listing.title}</p>
        <p style={{ color: T.textPrimary, fontSize: T.sz26, fontWeight: 700, marginBottom: T.gap }}>{listing.price !== null ? `$${fmt(listing.price)}` : "—"}</p>
        <ScoreBadge score={score} />
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {fields.map(({ label, value }) => <Field key={label} label={label} value={value} />)}
        </div>
      </div>

      {listing.location && (
        <div style={{ ...S.card, ...S.row, padding: T.padSm, gap: T.gapSm }}>
          <span style={{ fontSize: T.sz14 }}>📍</span>
          <span style={{ color: T.textPrimary, fontSize: T.sz14 }}>{listing.location}</span>
        </div>
      )}

      {listing.description && (
        <div style={{ ...S.card, padding: T.pad }}>
          <Label>Description</Label>
          <p style={{ color: T.textPrimary, fontSize: T.sz14, lineHeight: 1.55, whiteSpace: "pre-line" }}>{listing.description}</p>
        </div>
      )}

      {summaryState.status === "idle"    && <SecondaryBtn onClick={onSummarize}>✦ AI Summary</SecondaryBtn>}
      {summaryState.status === "loading" && <Spinner label="Generating summary…" />}
      {summaryState.status === "loaded"  && <SummaryCard summary={summaryState.summary} />}
      {summaryState.status === "error"   && (
        <div style={{ ...S.card, padding: T.padSm, borderLeft: `3px solid ${T.red}` }}>
          <p style={{ color: T.red, fontSize: T.sz13, fontWeight: 600, marginBottom: 2 }}>Summary failed</p>
          <p style={{ color: T.textSecondary, fontSize: T.sz12, wordBreak: "break-all", marginBottom: T.gapSm }}>{summaryState.message}</p>
          <SecondaryBtn onClick={onSummarize}>Retry</SecondaryBtn>
        </div>
      )}

      <p style={{ color: T.textMuted, fontSize: T.sz11, textAlign: "center" }}>
        Extracted {new Date(listing.extractedAt).toLocaleTimeString()}
      </p>

      <PrimaryBtn onClick={onSave} disabled={saveState === "saving" || saveState === "saved"} saved={saveState === "saved"}>
        {saveLabel}
      </PrimaryBtn>
      <SecondaryBtn onClick={onReanalyze}>Re-analyze</SecondaryBtn>
    </div>
  );
}

// ─── Comps view ───────────────────────────────────────────────────────────────

function CompRow({ comp, onDelete }: { comp: SavedComp; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const thumb = comp.images?.[0];

  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      <div style={{ ...S.row, padding: T.padSm, gap: T.gap, cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        {thumb && <img src={thumb} alt="" style={{ width: 48, height: 48, borderRadius: T.radiusSm, objectFit: "cover", flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: T.textPrimary, fontSize: T.sz13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {comp.title}
          </p>
          <p style={{ color: T.textSecondary, fontSize: T.sz12, marginTop: 2 }}>
            {comp.price !== null ? `$${fmt(comp.price)}` : "—"}
            {comp.mileage  ? ` · ${fmt(comp.mileage)} mi` : ""}
            {comp.location ? ` · ${comp.location}`        : ""}
          </p>
        </div>
        <span style={{ color: T.textMuted, fontSize: T.sz12, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {comp.images?.length > 0 && <ImageCarousel images={comp.images} />}
          <div style={{ ...S.col, padding: T.padSm, gap: T.gapSm }}>
            {comp.description && (
              <p style={{ color: T.textSecondary, fontSize: T.sz12, lineHeight: 1.5 }}>{comp.description}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {comp.year    && <Field label="Year"    value={String(comp.year)} />}
              {comp.make    && <Field label="Make"    value={comp.make} />}
              {comp.model   && <Field label="Model"   value={comp.model} />}
              {comp.mileage && <Field label="Mileage" value={`${fmt(comp.mileage)} mi`} />}
            </div>
            <p style={{ color: T.textMuted, fontSize: T.sz11 }}>
              Saved {new Date(comp.savedAt).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={() => onDelete(comp.id)}
              style={{ ...S.btnBase, background: "none", border: `1px solid ${T.border}`, color: T.red, fontSize: T.sz13, padding: "6px 0" }}
            >
              Remove comp
            </button>
          </div>
        </div>
      )}
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
    return <EmptyState title="No comps saved yet" body={'Analyze a listing and click "Save as Comp" to add one'} />;
  }

  return (
    <div style={{ ...S.col, gap: T.gapSm }}>
      <p style={{ color: T.textSecondary, fontSize: T.sz12, marginBottom: 2 }}>
        {comps.length} saved {comps.length === 1 ? "comp" : "comps"}
      </p>
      {comps.map((comp) => <CompRow key={comp.id} comp={comp} onDelete={handleDelete} />)}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

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
      if (res.ok && res.data) setListingState({ status: "loaded", listing: res.data });
      else setListingState({ status: "error" });
    } catch {
      setListingState({ status: "error" });
    }
  }

  async function handleSave() {
    if (listingState.status !== "loaded") return;
    setSaveState("saving");
    try {
      const res = (await browser.runtime.sendMessage({ type: "SAVE_COMP", payload: listingState.listing })) as MessageResponse<SavedComp>;
      if (res.ok && res.data) { setComps((prev) => [res.data as SavedComp, ...prev]); setSaveState("saved"); }
      else setSaveState("error");
    } catch {
      setSaveState("error");
    }
  }

  async function handleSummarize() {
    if (listingState.status !== "loaded") return;
    setSummaryState({ status: "loading" });
    try {
      const res = (await browser.runtime.sendMessage({ type: "GET_AI_SUMMARY", payload: { listing: listingState.listing, comps } })) as { ok: boolean; data: ListingSummary | null; error?: string };
      if (res.ok && res.data) setSummaryState({ status: "loaded", summary: res.data });
      else setSummaryState({ status: "error", message: res.error ?? "Unknown error" });
    } catch (err) {
      setSummaryState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, fontFamily: T.font }}>
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ ...S.row, gap: T.gapSm }}>
          <div style={{ width: 32, height: 32, borderRadius: T.radiusSm, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: T.sz16 }}>🚗</div>
          <span style={{ color: T.textPrimary, fontSize: T.sz16, fontWeight: 700 }}>{EXTENSION_NAME}</span>
        </div>
        <div style={{ ...S.row, gap: 4 }}>
          {(["listing", "comps"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{ background: view === v ? T.blueLight : "transparent", border: "none", borderRadius: T.radiusSm, color: view === v ? T.blue : T.textSecondary, cursor: "pointer", fontSize: T.sz13, fontWeight: 600, padding: "5px 12px", textTransform: "capitalize" }}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {view === "comps" ? <CompsView /> : (
          <>
            {listingState.status === "idle" && (
              <EmptyState
                title="No listing loaded"
                body="Open a Facebook Marketplace vehicle listing to get started"
                action={<PrimaryBtn onClick={analyze}> Analyze Listing</PrimaryBtn>}
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
                body="Make sure you're on a Facebook Marketplace vehicle listing"
                action={<SecondaryBtn onClick={analyze}>Try Again</SecondaryBtn>}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
