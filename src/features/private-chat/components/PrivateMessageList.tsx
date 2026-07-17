// ---------------------------------------------------------------------------
// PrivateMessageList — Telegram-style 1-on-1 message view.
//
// Layout:
//   - Messages from the current user: right-aligned, accent-colored bubble.
//   - Messages from the other user: left-aligned, dark bubble.
//   - System messages ("X is online" / "X went offline"): centered, muted.
//
// Unlike the public MessageList, there's no per-user color hashing here —
// in a 1-on-1 chat there are only two participants, so we use the app's
// accent color for "you" and the dark surface for "them". Avatars are
// shown only for the other user's messages (your own side doesn't need
// an avatar when the bubble is already right-aligned and accent-colored).
// ---------------------------------------------------------------------------

import { memo, useEffect, useRef } from "react";
import { isPrivateMessage, type PrivateChatWsMessage } from "@/shared/types";
import type { UserId } from "@/shared/types";
import { Avatar } from "@/features/auth";

interface PrivateMessageListProps {
  messages: PrivateChatWsMessage[];
  /** ID of the current user — used to decide left vs. right alignment. */
  currentUserId: UserId | undefined;
  /** The other participant's ID + name + image (for their avatar). */
  otherUserId: UserId;
  otherUserName: string;
  otherUserImage: string | null;
}

/** Format an ISO timestamp as a short local time, e.g. "14:23". */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

interface RenderedRow {
  kind: "system" | "message";
  content: string;
  timestamp: string;
  senderId?: UserId;
  isOwn: boolean;
  /** Whether to show the other user's avatar (collapsed on consecutive msgs). */
  showAvatar: boolean;
  key: string;
}

function toRendered(
  messages: PrivateChatWsMessage[],
  currentUserId: UserId | undefined,
): RenderedRow[] {
  const out: RenderedRow[] = [];
  messages.forEach((msg, idx) => {
    if (msg.type === "system") {
      out.push({
        kind: "system",
        content: msg.content,
        timestamp: "",
        isOwn: false,
        showAvatar: false,
        key: `sys-${idx}`,
      });
      return;
    }
    if (!isPrivateMessage(msg)) return; // history is unwrapped by the hook

    const prev = messages[idx - 1];
    const prevSender =
      prev && isPrivateMessage(prev) ? prev.sender_id : undefined;
    // Show the other user's avatar when the sender changes OR when there's
    // a gap (system message) before this one. Own messages never show an
    // avatar — they're already visually distinct (right + accent).
    const isOwn = msg.sender_id === currentUserId;
    const showAvatar =
      !isOwn && (prevSender !== msg.sender_id || prev?.type !== "message");

    out.push({
      kind: "message",
      content: msg.content,
      timestamp: msg.created_at,
      senderId: msg.sender_id,
      isOwn,
      showAvatar,
      key: `msg-${idx}`,
    });
  });
  return out;
}

function PrivateMessageList({
  messages,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserImage,
}: PrivateMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const rendered = toRendered(messages, currentUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-2 text-[13px] px-6 text-center">
        No messages yet — say hello 👋
      </div>
    );
  }

  return (
    <div className="message-list flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
      {rendered.map((row) => {
        if (row.kind === "system") {
          return (
            <div
              key={row.key}
              className="text-center text-fg-2 text-xs py-1.5"
            >
              — {row.content} —
            </div>
          );
        }

        const isOwn = row.isOwn;
        return (
          <div
            key={row.key}
            className={
              "flex gap-2.5 items-end " +
              (isOwn ? "flex-row-reverse" : "flex-row")
            }
          >
            {/* Avatar slot — only for the other user's messages.
                Own messages skip the avatar entirely (the accent bubble is
                enough). The slot is reserved (invisible) on consecutive
                other-user messages to keep alignment. */}
            {!isOwn && (
              <div className={row.showAvatar ? "visible" : "invisible"}>
                <Avatar
                  userId={otherUserId}
                  name={otherUserName}
                  imageUrl={otherUserImage}
                  size={32}
                  href={`/users/${otherUserId}`}
                  interactive
                />
              </div>
            )}

            <div
              className={
                "flex flex-col max-w-[70%] " +
                (isOwn ? "items-end" : "items-start")
              }
            >
              <div
                className={
                  "px-3 py-2 rounded-2xl break-words whitespace-pre-wrap " +
                  "text-sm leading-relaxed " +
                  (isOwn
                    ? "bg-accent text-white rounded-br-sm"
                    : "bg-bg-2 text-fg-0 rounded-bl-sm")
                }
              >
                {row.content}
              </div>
              {row.timestamp && (
                <span
                  className={
                    "text-[10px] text-fg-2 mt-0.5 " +
                    (isOwn ? "text-right" : "text-left")
                  }
                >
                  {formatTime(row.timestamp)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export default memo(PrivateMessageList);
