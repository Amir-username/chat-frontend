import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomSidebar from "../components/RoomSidebar";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import { useAuthStore } from "@/features/auth";
import { useChatSocket, type ConnectionStatus } from "../hooks/useChatSocket";
import { useResizable } from "../hooks/useResizable";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRoomsStore, useActiveRoom } from "../store/roomsStore";
import type { ChatMessage } from "@/shared/types";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: "idle",
  connecting: "connecting…",
  open: "connected",
  closed: "reconnecting…",
  error: "error",
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle: "#6b7280", // var(--color-fg-2)
  connecting: "#f59e0b", // var(--color-warn)
  open: "#22c55e", // var(--color-success)
  closed: "#f59e0b",
  error: "#ef4444", // var(--color-danger)
};

// Breakpoint below which we switch to the mobile drawer layout.
const MOBILE_BREAKPOINT = "(max-width: 768px)";

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

  // Persisted room navigation state lives in Zustand (roomsStore) so it
  // survives reloads via zustand/middleware/persist — no manual localStorage
  // helpers or useEffect-on-change needed here.
  const joinedRooms = useRoomsStore((s) => s.joinedRooms);
  const selectRoom = useRoomsStore((s) => s.selectRoom);
  const activeRoom = useActiveRoom();

  // Ephemeral UI state — local to this component, shouldn't persist.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Mobile-only: is the sidebar drawer currently open?
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Draggable sidebar width — persisted to localStorage so it survives reloads.
  // Only used on desktop; on mobile the drawer is a fixed 85% of viewport.
  const { width: sidebarWidth, isResizing, onMouseDown: onSidebarResize } =
    useResizable({
      initialWidth: 260,
      minWidth: 180,
      maxWidth: 480,
      storageKey: "chat.sidebar_width",
    });

  // Clear messages when switching rooms — the new socket will deliver history.
  const onMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { status, send } = useChatSocket({
    roomId: activeRoom,
    onMessage,
  });

  // Clear messages immediately when switching rooms (before the socket even
  // opens) so the user doesn't briefly see the old room's messages under the
  // new room's header.
  useEffect(() => {
    setMessages([]);
  }, [activeRoom]);

  // Also clear on every (re)connect. The server replays full history on each
  // new WebSocket connection, so without this, a transient disconnect would
  // duplicate every message in the list.
  useEffect(() => {
    if (status === "connecting") {
      setMessages([]);
    }
  }, [status]);

  // Close the mobile drawer automatically when switching to desktop, so the
  // backdrop doesn't linger over the desktop layout.
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Lock body scroll while the mobile drawer is open so the page doesn't
  // scroll behind the backdrop.
  useEffect(() => {
    if (!isMobile) return;
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, sidebarOpen]);

  function handleSelectRoom(room: string) {
    if (room === activeRoom) {
      // On mobile, tapping the active room just closes the drawer.
      if (isMobile) setSidebarOpen(false);
      return;
    }
    selectRoom(room); // also joins if not already joined
    if (isMobile) setSidebarOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const headerStatus = useMemo(
    () => (
      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: STATUS_COLOR[status] }}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {STATUS_LABEL[status]}
      </span>
    ),
    [status],
  );

  const disconnected = status === "closed" || status === "error" || status === "connecting";

  // The sidebar element is the same on both layouts; what changes is how it's
  // positioned (in-flow on desktop, absolute drawer on mobile).
  const sidebar = (
    <RoomSidebar
      rooms={joinedRooms}
      activeRoom={activeRoom}
      onSelect={handleSelectRoom}
      userEmail={user?.email}
      onLogout={handleLogout}
      width={isMobile ? undefined : sidebarWidth}
    />
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ userSelect: isResizing ? "none" : undefined }}
    >
      {isMobile ? (
        // ----- Mobile layout: drawer + backdrop -----
        <>
          {sidebarOpen && (
            <div
              className="drawer-backdrop"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`drawer${sidebarOpen ? " drawer--open" : ""}`}
            aria-hidden={!sidebarOpen}
          >
            {sidebar}
          </div>
        </>
      ) : (
        // ----- Desktop layout: in-flow sidebar + drag handle -----
        <>
          {sidebar}
          <div
            onMouseDown={onSidebarResize}
            className={`resize-handle${isResizing ? " resize-handle--active" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuenow={sidebarWidth}
            aria-valuemin={180}
            aria-valuemax={480}
          />
        </>
      )}

      <main
        className="flex-1 flex flex-col min-w-0 bg-bg-0"
        style={{ pointerEvents: isResizing ? "none" : undefined }}
      >
        {/* Room header */}
        <header
          className={
            "h-14 flex-shrink-0 border-b border-bg-3 flex items-center " +
            "justify-between gap-3 bg-bg-1 " +
            (isMobile ? "px-3" : "px-5")
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — only on mobile. */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="hamburger"
                aria-label="Open room list"
                aria-expanded={sidebarOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M3 12h18M3 18h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            <span className="text-fg-2">#</span>
            <span className="font-semibold text-[15px] overflow-hidden text-ellipsis whitespace-nowrap">
              {activeRoom ?? "—"}
            </span>
          </div>
          {headerStatus}
        </header>

        <MessageList messages={messages} currentUserId={user?.id} />

        <MessageInput
          onSend={send}
          disabled={status !== "open"}
          disconnected={disconnected && status !== "connecting"}
        />
      </main>
    </div>
  );
}
