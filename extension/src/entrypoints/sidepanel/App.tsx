import { useState, useEffect } from "react";
import type { Listing, MessageResponse, MessageType } from "~/types";
import { EXTENSION_NAME } from "~/lib";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; listing: Listing }
  | { status: "error" };

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E6EB",
  borderRadius: 8,
  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
};

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span style={{ color: "#65676B", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#1C1E21", fontSize: 15, fontWeight: 600 }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        paddingTop: 64,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function ListingCard({ listing, onReanalyze }: { listing: Listing; onReanalyze: () => void }) {
  const fields: { label: string; value: string | null }[] = [
    { label: "Year", value: listing.year ? String(listing.year) : null },
    { label: "Make", value: listing.make },
    { label: "Model", value: listing.model },
    { label: "Mileage", value: listing.mileage ? `${fmt(listing.mileage)} mi` : null },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div style={{ ...card, padding: "12px 16px" }}>
        <p style={{ color: "#1C1E21", fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
          {listing.title}
        </p>
        <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          {listing.price !== null ? `$${fmt(listing.price)}` : "—"}
        </p>
        <div
          style={{
            borderTop: "1px solid #E4E6EB",
            paddingTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 16px",
          }}
        >
          {fields.map(({ label, value }) => (
            <Field key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {listing.location && (
        <div
          style={{
            ...card,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#1C1E21",
            fontSize: 14,
          }}
        >
          <span style={{ color: "#65676B" }}>📍</span>
          {listing.location}
        </div>
      )}

      {listing.description && (
        <div style={{ ...card, padding: "12px 16px" }}>
          <p style={{ color: "#65676B", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Description
          </p>
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
        onClick={onReanalyze}
        style={{
          background: "#E7F3FF",
          border: "none",
          borderRadius: 6,
          color: "#1877F2",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 600,
          padding: "8px 0",
          width: "100%",
        }}
      >
        Re-analyze
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid #E4E6EB",
          borderTopColor: "#1877F2",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#65676B", fontSize: 13 }}>Analyzing listing…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const listener = (message: { type: MessageType; payload?: Listing }) => {
      if (message.type === "LISTING_EXTRACTED" && message.payload) {
        setState({ status: "loaded", listing: message.payload });
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  async function analyze() {
    setState({ status: "loading" });
    try {
      const response = (await browser.runtime.sendMessage({
        type: "EXTRACT",
      })) as MessageResponse<Listing>;

      if (response.ok && response.data) {
        setState({ status: "loaded", listing: response.data });
      } else {
        setState({ status: "error" });
      }
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#F0F2F5",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #E4E6EB",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#1877F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🚗
          </div>
          <span style={{ color: "#1C1E21", fontSize: 16, fontWeight: 700 }}>
            {EXTENSION_NAME}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {state.status === "idle" && (
          <CenteredMessage>
            <p style={{ color: "#1C1E21", fontSize: 16, fontWeight: 600 }}>No listing loaded</p>
            <p style={{ color: "#65676B", fontSize: 14, lineHeight: 1.5 }}>
              Open a Facebook Marketplace
              <br />
              vehicle listing to get started
            </p>
            <button
              type="button"
              onClick={analyze}
              style={{
                background: "#1877F2",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                marginTop: 8,
                padding: "8px 24px",
              }}
            >
              Analyze Listing
            </button>
          </CenteredMessage>
        )}

        {state.status === "loading" && <Spinner />}

        {state.status === "loaded" && (
          <ListingCard listing={state.listing} onReanalyze={analyze} />
        )}

        {state.status === "error" && (
          <CenteredMessage>
            <p style={{ color: "#1C1E21", fontSize: 16, fontWeight: 600 }}>Extraction failed</p>
            <p style={{ color: "#65676B", fontSize: 14, lineHeight: 1.5 }}>
              Make sure you're on a Facebook
              <br />
              Marketplace vehicle listing
            </p>
            <button
              type="button"
              onClick={analyze}
              style={{
                background: "#E7F3FF",
                border: "none",
                borderRadius: 6,
                color: "#1877F2",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                marginTop: 8,
                padding: "8px 24px",
              }}
            >
              Try Again
            </button>
          </CenteredMessage>
        )}
      </main>
    </div>
  );
}
