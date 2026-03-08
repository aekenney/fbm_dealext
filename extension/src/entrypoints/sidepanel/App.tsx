import { EXTENSION_NAME, ANALYZE_LABEL } from "~/lib";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
      <h1 className="text-lg font-semibold">{EXTENSION_NAME}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Open a Facebook Marketplace car listing, then click the extension to analyze it.
      </p>
      <div className="mt-4 rounded border border-gray-200 bg-white p-3 text-sm">
        <p className="font-medium">{ANALYZE_LABEL}</p>
        <p className="mt-1 text-gray-600">
          Extract listing details, confirm or edit, then score as Deal / Fair / Overpriced.
        </p>
        <button
          type="button"
          className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          disabled
        >
          {ANALYZE_LABEL}
        </button>
      </div>
    </div>
  );
}
