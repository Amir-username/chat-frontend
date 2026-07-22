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
        target: "https://chat-service.fastapicloud.dev/",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      // WebSocket calls go through /ws/* — the chat hook connects to
      // `${wsBase}/ws/chat/${roomId}?token=...` where wsBase is "" (same origin)
      "/ws": {
        target: "ws://chat-service.fastapicloud.dev/docs",
        ws: true,
        changeOrigin: true,
      },
      // Private-chat WebSocket lives at /private/ws/chat/{chat_id} on the
      // backend. Proxied separately because it's not under /ws.
      "/private/ws": {
        target: "ws://chat-service.fastapicloud.dev/docs",
        ws: true,
        changeOrigin: true,
      },
      // Profile images served by the backend as static files. The backend
      // returns relative URLs like `/uploads/profile_images/1_abc.jpg`, so
      // proxying /uploads lets the browser fetch them same-origin in dev.
      "/uploads": {
        target: "https://chat-service.fastapicloud.dev/docs",
        changeOrigin: true,
      },
    },
  },
});
