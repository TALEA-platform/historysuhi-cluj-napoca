import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/historysuhi-cluj-napoca/",
  plugins: [react()],
  publicDir: false,
});
