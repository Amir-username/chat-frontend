import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RoomSidebar from "../components/RoomSidebar";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import { useAuthStore, UserSearchOverlay } from "@/features/auth";
import { useChatSocket, type ConnectionStatus } from "../hooks/useChatSocket";
import { useResizable } from "../hooks/useResizable";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useRoomsStore, useActiveRoom } from "../store/roomsStore";
import type { ChatMessage, ProfileResponse } from "@/shared/types";

const MOBILE_BREAKPOINT = "(max-width: 768px)";

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  idle: "#6b7280",
  connecting: "#f59e0b",
  open: "#22c55e",
  closed: "#f59e0b",
  error: "#ef4444",
};

export default function ChatPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

  const joinedRooms = useRoomsStore((s) => s.joinedRooms);
  const selectRoom = useRoomsStore((s) => s.selectRoom);
  const activeRoom = useActiveRoom();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { width: sidebarWidth, isResizing, onMouseDown: onSidebarResize } =
    useResizable({
      initialWidth: 260,
      minWidth: 180,
      maxWidth: 480,
      storageKey: "chat.sidebar_width",
    });

  const onMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { status, send } = useChatSocket({
    roomId: activeRoom,
    onMessage,
  });

  useEffect(() => {
    setMessages([]);
  }, [activeRoom]);

  useEffect(() => {
    if (status === "connecting") {
      setMessages([]);
    }
  }, [status]);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

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
      if (isMobile) setSidebarOpen(false);
      return;
    }
    selectRoom(room);
    if (isMobile) setSidebarOpen(false);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function handleSearchSelectUser(user: ProfileResponse) {
    navigate(`/users/${user.id}`);
  }

  const statusLabel: Record<ConnectionStatus, string> = useMemo(
    () => ({
      idle: t("connection.idle"),
      connecting: t("connection.connecting"),
      open: t("connection.connected"),
      closed: t("connection.reconnecting"),
      error: t("connection.error"),
    }),
    [t],
  );

  const headerStatus = useMemo(
    () => (
      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: STATUS_COLOR[status] }}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {statusLabel[status]}
      </span>
    ),
    [status, statusLabel],
  );

  const disconnected = status === "closed" || status === "error" || status === "connecting";

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
        <header
          className={
            "h-14 shrink-0 border-b border-bg-3 flex items-center " +
            "justify-between gap-3 bg-bg-1 " +
            (isMobile ? "px-3" : "px-5")
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="hamburger"
                aria-label={t("chat.rooms")}
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
          <div className="flex items-center gap-2">
            {headerStatus}
            <button
              onClick={() => setSearchOpen(true)}
              className="btn btn-ghost px-2 py-1.5"
              aria-label={t("common.searchUsers")}
              title={t("common.searchUsers")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M21 21l-4.3-4.3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <MessageList messages={messages} currentUserId={user?.id} />

        <MessageInput
          onSend={send}
          disabled={status !== "open"}
          disconnected={disconnected && status !== "connecting"}
        />
      </main>

      <UserSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectUser={handleSearchSelectUser}
      />
    </div>
  );
}
