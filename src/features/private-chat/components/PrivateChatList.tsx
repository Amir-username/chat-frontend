// ---------------------------------------------------------------------------
// PrivateChatList — sidebar list of the current user's 1-on-1 conversations.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PrivateChatListItem, ProfileResponse } from "@/shared/types";
import { listPrivateChats, startPrivateChat } from "../api/privateChat";
import { Avatar, UserSearchOverlay } from "@/features/auth";
import SearchIcon from "@/shared/components/icons/SearchIcon";
import LanguageSwitcher from "@/shared/components/LanguageSwitcher";

interface PrivateChatListProps {
  activeChatId: number | null;
  onSelect: (chatId: number) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onLogout: () => void;
}

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
  showBackButton = false,
  onBack,
  onLogout
}: PrivateChatListProps) {
  const { t } = useTranslation();
  const [chats, setChats] = useState<PrivateChatListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [startingChatFor, setStartingChatFor] = useState<number | null>(null);

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
            err instanceof Error ? err.message : t("chat.failedToLoadConversations");
          setError(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (activeChatId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listPrivateChats();
        if (!cancelled) setChats(data);
      } catch {
        // Silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  async function handleSearchSelectUser(user: ProfileResponse) {
    setStartingChatFor(Number(user.id));
    try {
      const chat = await startPrivateChat({ user_id: Number(user.id) });
      onSelect(chat.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("chat.failedToLoadChat");
      setError(msg);
    } finally {
      setStartingChatFor(null);
    }
  }

  return (
    <aside className="w-full h-full bg-bg-1 border-r border-bg-3 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-bg-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={onBack}
              className="btn btn-ghost px-2 py-1 text-sm"
              aria-label={t("common.back")}
            >
              ←
            </button>
          )}
          <h2 className="font-semibold text-[15px]">{t("chat.directMessages")}</h2>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={() => setSearchOpen(true)}
            disabled={startingChatFor !== null}
            className="btn btn-ghost px-2 py-1 text-sm"
            title={t("chat.startNewChat")}
          >
            <SearchIcon />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {error && <div className="px-4 py-3 text-sm text-red-500">{error}</div>}
        {chats === null && !error && (
          <div className="px-4 py-6 text-sm text-fg-2 text-center">
            {t("common.loading")}
          </div>
        )}
        {chats !== null && chats.length === 0 && (
          <div className="px-4 py-8 text-sm text-fg-2 text-center">
            {t("chat.noConversationsYet")}
            <br />
            {t("chat.visitProfileToChat")}
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
                  (active ? "bg-indigo-500/15" : "hover:bg-bg-2")
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
                      <span className="text-[11px] text-fg-2 shrink-0">
                        {formatRelative(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-fg-2 truncate mt-0.5">
                    {chat.last_message ?? t("chat.noMessagesInChat")}
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      <div className="pb-4">
        <button
          onClick={onLogout}
          className="btn btn-ghost px-2.5 py-1.5 text-xs"
          title={t("common.signOut")}
        >
          {t("common.signOut")}
        </button>
      </div>

      <UserSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectUser={handleSearchSelectUser}
        title={t("chat.startNewChat")}
        placeholder={t("search.chatSearchPlaceholder")}
      />
    </aside>
  );
}
