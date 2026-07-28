// ---------------------------------------------------------------------------
// UserSearchOverlay — reusable modal for searching users by name.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUserSearch, Avatar } from "@/features/auth";
import type { ProfileResponse } from "@/shared/types";

interface UserSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (user: ProfileResponse) => void;
  placeholder?: string;
  title?: string;
}

export default function UserSearchOverlay({
  open,
  onClose,
  onSelectUser,
  placeholder,
  title,
}: UserSearchOverlayProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, status, error, reset } = useUserSearch();

  const resolvedTitle = title ?? t("search.title");
  const resolvedPlaceholder = placeholder ?? t("search.placeholder");

  useEffect(() => {
    if (open) {
      const t2 = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t2);
    } else {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      aria-label={resolvedTitle}
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-bg-1 border border-bg-3 rounded-lg shadow-2xl flex flex-col max-h-[75vh]">
        <div className="p-4 border-b border-bg-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold">{resolvedTitle}</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost px-2 py-1 text-sm"
              aria-label={t("common.closeSearch")}
            >
              ✕
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={resolvedPlaceholder}
            className="w-full"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {status === "idle" && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              {t("search.typeToSearch")}
            </div>
          )}

          {status === "loading" && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              {t("search.searching")}
            </div>
          )}

          {status === "error" && (
            <div className="px-4 py-6 text-center text-red-500 text-sm">
              {error}
            </div>
          )}

          {status === "success" && results.length === 0 && (
            <div className="px-4 py-8 text-center text-fg-2 text-sm">
              {t("search.noUsersFound", { query: query.trim() })}
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