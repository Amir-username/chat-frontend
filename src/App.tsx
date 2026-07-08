import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { LoginPage, RegisterPage } from "@/features/auth";
import { ChatPage } from "@/features/chat";

/** Full-screen spinner shown while we hydrate the session. */
function FullScreenLoader() {
  return (
    <div className="h-screen flex items-center justify-center text-fg-1">
      <div>Loading…</div>
    </div>
  );
}

export default function App() {
  // Select only what we need — components re-render only when their slice
  // changes, not on every auth-state update.
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      {/* Public routes — redirect to /chat if already logged in. */}
      <Route
        path="/login"
        element={user ? <Navigate to="/chat" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/chat" replace /> : <RegisterPage />}
      />

      {/* Protected routes — redirect to /login if not authenticated. */}
      <Route
        path="/chat/*"
        element={user ? <ChatPage /> : <Navigate to="/login" replace />}
      />

      {/* Fallback. */}
      <Route path="*" element={<Navigate to={user ? "/chat" : "/login"} replace />} />
    </Routes>
  );
}
