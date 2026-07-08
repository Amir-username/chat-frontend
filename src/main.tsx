import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@/index.css";

// Note: no <AuthProvider> wrapper anymore — Zustand stores are module-level
// singletons, so the auth store initializes itself when first imported (which
// happens transitively via App → useAuthStore). The initial /me hydration
// kicks off immediately at store-creation time.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
