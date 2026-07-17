// ---------------------------------------------------------------------------
// PrivateChatList — sidebar list of the current user's 1-on-1 conversations.
//
// Each row shows the other participant's avatar, name, last message preview,
// and a relative timestamp. Clicking a row selects that chat.
//
// Shown in a two-pane layout (list | active chat) on desktop, and as the
// full view on mobile when no chat is selected.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type { PrivateChatListItem } from "@/shared/types";
import { listPrivateChats } from "../api/privateChat";
import { Avatar } from "@/features/auth";

interface PrivateChatListProps {
  /** ID of the currently-open chat (for highlight). Null if none selected. */
  activeChatId: number | null;
  /** Called when the user picks a chat from the list. */
  onSelect: (chatId: number) => void;
  /** Called when the user wants to start a new chat (navigates to user list
   *  or a search UI). Optional — hidden if not provided. */
  onNewChat?: () => void;
  /** When true, shows a back button instead of the "new chat" button.
   *  Used on mobile to navigate back to the rooms sidebar. */
  showBackButton?: boolean;
  onBack?: () => void;
}

/** Format an ISO timestamp as a short relative string:
 *  - within 1 min: "now"
 *  - same day: "14:23"
 *  - within a week: "Mon"
 *  - older: "Mar 3" */
function formatRelative(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function PrivateChatList({
  activeChatId,
  onSelect,
  onNewChat,
  showBackButton = false,
  onBack,
}: PrivateChatListProps) {
  const [chats, setChats] = useState<PrivateChatListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the chat list on mount. Re-fetch when the component remounts
  // (e.g. when navigating back to the list view on mobile).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listPrivateChats();
        if (!cancelled) {
          setChats(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load conversations";
          setError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="w-full h-full bg-bg-1 border-r border-bg-3 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-bg-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={onBack}
              className="btn btn-ghost px-2 py-1 text-sm"
              aria-label="Back to rooms"
            >
              ←
            </button>
          )}
          <h2 className="font-semibold text-[15px]">Direct Messages</h2>
        </div>
        {onNewChat && !showBackButton && (
          <button
            onClick={onNewChat}
            className="btn btn-ghost px-2 py-1 text-sm"
            title="Start a new chat"
          >
            + New
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="px-4 py-3 text-sm text-red-500">{error}</div>
        )}
        {chats === null && !error && (
          <div className="px-4 py-6 text-sm text-fg-2 text-center">
            Loading…
          </div>
        )}
        {chats !== null && chats.length === 0 && (
          <div className="px-4 py-8 text-sm text-fg-2 text-center">
            No conversations yet.
            <br />
            Visit someone's profile to start a chat.
          </div>
        )}
        {chats !== null &&
          chats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <button
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={
                  "w-full text-left px-3 py-3 flex items-center gap-3 " +
                  "border-none cursor-pointer transition-colors " +
                  (active
                    ? "bg-indigo-500/15"
                    : "hover:bg-bg-2")
                }
              >
                <Avatar
                  userId={chat.other_user_id}
                  name={chat.other_user_name}
                  imageUrl={chat.other_user_image}
                  size={40}
                  href={undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={
                        "text-[14px] truncate " +
                        (active ? "text-fg-0 font-medium" : "text-fg-0")
                      }
                    >
                      {chat.other_user_name}
                    </span>
                    {chat.last_message_at && (
                      <span className="text-[11px] text-fg-2 flex-shrink-0">
                        {formatRelative(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-fg-2 truncate mt-0.5">
                    {chat.last_message ?? "No messages yet"}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}
