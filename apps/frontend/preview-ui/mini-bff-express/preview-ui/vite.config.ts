import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE || "http://localhost:4117";

  return {
    plugins: [react()],
    base: "/preview/",
    build: {
      outDir: path.resolve(__dirname, "../public"),
      emptyOutDir: true,
    },
    server: {
      port: Number(env.VITE_DEV_PORT || 4173),
      proxy: {
        "/health": apiBase,
        "/cards": apiBase,
        "/chat": apiBase,
        "/wallet": apiBase,
      },
    },
  };
});
