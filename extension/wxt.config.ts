import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import { EXTENSION_NAME, EXTENSION_DESCRIPTION } from "./src/lib/constants";

export default defineConfig({
  srcDir: "src",
  outDir: "output",
  manifest: {
    name: EXTENSION_NAME,
    description: EXTENSION_DESCRIPTION,
    version: "0.1.0",
    permissions: ["activeTab", "storage", "scripting", "sidePanel"],
  },
  vite: () => ({
    plugins: [react()],
  }),
});
