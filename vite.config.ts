import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub Pages 项目站点托管在 /fluxnav/，其他环境保持原路径。
export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_PAGES === "true" ? "/fluxnav/" : "/",
  plugins: [react(), tailwindcss(), ...(mode === 'portable' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'portable' ? 'dist-portable' : 'dist' },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
