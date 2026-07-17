import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/features/auth";
import { LoginPage, RegisterPage, ProfilePage, UserProfilePage } from "@/features/auth";
import { ChatPage } from "@/features/chat";
import { PrivateChatPage } from "@/features/private-chat";

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
      <Route
        path="/profile"
        element={user ? <ProfilePage /> : <Navigate to="/login" replace />}
      />
      {/* Public profile of any user (by ID). */}
      <Route
        path="/users/:userId"
        element={user ? <UserProfilePage /> : <Navigate to="/login" replace />}
      />
      {/* Private (1-on-1) direct messages. Active chat is via ?chat=<id>. */}
      <Route
        path="/private-chat"
        element={user ? <PrivateChatPage /> : <Navigate to="/login" replace />}
      />

      {/* Fallback. */}
      <Route path="*" element={<Navigate to={user ? "/chat" : "/login"} replace />} />
    </Routes>
  );
}
