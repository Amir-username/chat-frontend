import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The backend (FastAPI chat-service) runs on http://localhost:8000.
// We proxy /api and /ws from the Vite dev server (5173) to it so the browser
// can use same-origin requests and WebSockets without CORS headaches.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // All REST calls go through /api/* — the axios client uses baseURL "/api"
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      // WebSocket calls go through /ws/* — the chat hook connects to
      // `${wsBase}/ws/chat/${roomId}?token=...` where wsBase is "" (same origin)
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
