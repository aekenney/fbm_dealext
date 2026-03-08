import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import { OPTIONS_TITLE, SETTINGS_DESCRIPTION } from "~/lib";

function OptionsApp() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">{OPTIONS_TITLE}</h1>
      <p className="mt-2 text-sm text-gray-600">{SETTINGS_DESCRIPTION}</p>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
);
