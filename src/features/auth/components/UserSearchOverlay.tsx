// ---------------------------------------------------------------------------
// UserSearchOverlay — reusable modal for searching users by name.
//
// Wraps the `useUserSearch` hook (debounce + AbortController + state machine)
// in a centered modal with an autofocused input and a live results list.
//
// The parent decides what happens when a user is picked — pass an
// `onSelectUser` callback (e.g. navigate to their profile, or start a
// private chat). The overlay closes itself after a selection.
//
// Keyboard:
//   - Escape closes the overlay
//   - (Future: arrow keys to navigate results — out of scope for now)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useUserSearch, Avatar } from "@/features/auth";
import type { ProfileResponse } from "@/shared/types";

interface UserSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user picks a result. The overlay closes after. */
  onSelectUser: (user: ProfileResponse) => void;
  /** Optional placeholder text for the input. */
  placeholder?: string;
  /** Optional title shown above the input. */
  title?: string;
}

export default function UserSearchOverlay({
  open,
  onClose,
  onSelectUser,
  placeholder = "Search users by name…",
  title = "Find users",
}: UserSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, status, error, reset } = useUserSearch();

  // Autofocus the input when the overlay opens; reset state when it closes.
  useEffect(() => {
    if (open) {
      // Slight delay so the input is mounted before we focus it.
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    } else {
      // Reset search state when closing so reopening starts fresh.
      reset();
    }
  }, [open, reset]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function handleSelect(user: ProfileResponse) {
    onSelectUser(user);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-1 border border-bg-3 rounded-lg shadow-2xl flex flex-col max-h-[75vh]">
        {/* Header + input */}
        <div className="p-4 border-b border-bg-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost px-2 py-1 text-sm"
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {status === "idle" && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              Type a name to search.
            </div>
          )}

          {status === "loading" && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              Searching…
            </div>
          )}

          {status === "error" && (
            <div className="px-4 py-6 text-center text-red-500 text-sm">
              {error}
            </div>
          )}

          {status === "success" && results.length === 0 && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              No users found for “{query.trim()}”.
            </div>
          )}

          {status === "success" &&
            results.map((user) => (
              <button
                key={String(user.id)}
                onClick={() => handleSelect(user)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 border-none cursor-pointer hover:bg-bg-2 transition-colors"
              >
                <Avatar
                  userId={user.id}
                  name={user.name}
                  imageUrl={user.profile_image}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-fg-0 truncate">
                    {user.name}
                  </div>
                  {user.bio && (
                    <div className="text-[12px] text-fg-2 truncate mt-0.5">
                      {user.bio}
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
