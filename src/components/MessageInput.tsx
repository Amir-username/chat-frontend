import { useState, type FormEvent, type KeyboardEvent } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  /** When true, shows "Reconnecting…" instead of the input. */
  disconnected: boolean;
}

export default function MessageInput({ onSend, disabled, disconnected }: MessageInputProps) {
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
      className="message-input px-5 pt-3 pb-4 border-t border-bg-3 bg-bg-1 flex gap-2.5 items-end"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
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
    </form>
  );
}
