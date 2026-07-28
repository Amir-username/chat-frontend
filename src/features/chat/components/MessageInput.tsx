import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

export interface ReplyTarget {
  id: number;
  senderName: string;
  contentPreview: string;
}

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  disconnected: boolean;
  replyTarget?: ReplyTarget | null;
  onCancelReply?: () => void;
}

export default function MessageInput({
  onSend,
  disabled,
  disconnected,
  replyTarget,
  onCancelReply,
}: MessageInputProps) {
  const { t } = useTranslation();
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (disconnected) {
    return (
      <div className="px-5 py-3.5 border-t border-bg-3 bg-bg-1 text-warn text-[13px] text-center">
        {t("connection.disconnected")}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="message-input px-5 pt-3 pb-4 border-t border-bg-3 bg-bg-1 flex flex-col gap-2"
    >
      {replyTarget && (
        <div className="flex items-center gap-2 bg-bg-2 border-l-[3px] border-accent rounded-md px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-accent truncate">
              {t("common.replyTo", { name: replyTarget.senderName })}
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
              aria-label={t("common.cancelReply")}
              title={t("common.cancelReply")}
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
            replyTarget
              ? t("chat.replyToPlaceholder", { name: replyTarget.senderName })
              : t("chat.typeMessage")
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
          {t("common.send")}
        </button>
      </div>
    </form>
  );
}
