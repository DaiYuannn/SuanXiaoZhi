import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isGhPagesBuild = process.env.GITHUB_PAGES === "true";
const repoName = "SuanXiaoZhi";

export default defineConfig({
  base: isGhPagesBuild ? `/${repoName}/` : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
