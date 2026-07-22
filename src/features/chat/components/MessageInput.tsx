import { useState, type FormEvent, type KeyboardEvent } from "react";

/** When set, the input shows a dismissible reply-preview bar above the
 *  textarea (Telegram-style). Cleared on send or via the cancel button. */
export interface ReplyTarget {
  /** ID of the message being replied to — sent as `reply_to_id`. */
  id: number;
  /** Display name of the original sender, shown in the preview. */
  senderName: string;
  /** First line / truncated content of the original message. */
  contentPreview: string;
}

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  /** When true, shows "Reconnecting…" instead of the input. */
  disconnected: boolean;
  /** When set, shows a reply preview bar above the textarea. The next send
   *  will be a reply to this message; the parent should clear it on send. */
  replyTarget?: ReplyTarget | null;
  /** Called when the user dismisses the reply preview (clicks ✕). */
  onCancelReply?: () => void;
}

export default function MessageInput({
  onSend,
  disabled,
  disconnected,
  replyTarget,
  onCancelReply,
}: MessageInputProps) {
  const [text, setText] = useState("");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send, Shift+Enter for newline — the Slack/Discord convention.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (disconnected) {
    return (
      <div className="px-5 py-3.5 border-t border-bg-3 bg-bg-1 text-warn text-[13px] text-center">
        Disconnected — trying to reconnect…
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="message-input px-5 pt-3 pb-4 border-t border-bg-3 bg-bg-1 flex flex-col gap-2"
    >
      {/* Reply preview bar — shown only when replyTarget is set. Dismissible
          via the ✕ button (calls onCancelReply). The bar sits ABOVE the
          textarea+send row so it doesn't push them around. */}
      {replyTarget && (
        <div className="flex items-center gap-2 bg-bg-2 border-l-[3px] border-accent rounded-md px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-accent truncate">
              Replying to {replyTarget.senderName}
            </div>
            <div className="text-[12px] text-fg-2 truncate">
              {replyTarget.contentPreview}
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="btn btn-ghost px-2 py-0.5 text-sm text-fg-2 hover:text-fg-0"
              aria-label="Cancel reply"
              title="Cancel reply"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2.5 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            replyTarget ? `Reply to ${replyTarget.senderName}…` : "Type a message…"
          }
          rows={1}
          className="flex-1 resize-none max-h-40 min-h-[42px] px-3 py-2.5"
          disabled={disabled}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary h-[42px] px-[18px]"
          disabled={disabled || !text.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
