// ---------------------------------------------------------------------------
// Avatar — reusable user avatar component.
//
// Renders the user's profile picture if one is available, otherwise falls
// back to a colored circle with the first letter of their name (same stable
// color hashing used by chat messages, so a user's avatar is always the same
// color across the app).
//
// Optionally clickable — wraps in a <Link> when `href` is provided (e.g. to
// navigate to the user's public profile page).
// ---------------------------------------------------------------------------

import { Link } from "react-router-dom";
import { colorForUser, readableTextOn } from "@/features/chat/utils/colors";
import { resolveImageUrl } from "@/shared";
import type { UserId } from "@/shared/types";

interface AvatarProps {
  /** The user's ID — used for stable color hashing and image lookup. */
  userId: UserId | null | undefined;
  /** Display name — used for the fallback initial and as the img alt text. */
  name?: string | null;
  /** Profile image URL (relative path like `/uploads/...` or null). When
   *  null/empty, the colored-initial fallback is shown. */
  imageUrl?: string | null;
  /** Diameter in pixels. Defaults to 36 (matches chat message avatars). */
  size?: number;
  /** If provided, the avatar is wrapped in a <Link> to this path. */
  href?: string;
  /** Extra Tailwind classes (e.g. visibility toggling in chat). */
  className?: string;
  /** Whether to show a focus ring / hover affordance when clickable. */
  interactive?: boolean;
}

export default function Avatar({
  userId,
  name,
  imageUrl,
  size = 36,
  href,
  className = "",
  interactive = false,
}: AvatarProps) {
  const color = colorForUser(userId);
  const onColor = readableTextOn(color);
  const resolved = resolveImageUrl(imageUrl ?? null);
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  const dimension = { width: size, height: size };
  const fontSize = Math.round(size * 0.4);

  const inner = resolved ? (
    <img
      src={resolved}
      alt={name ?? "user avatar"}
      className="rounded-full object-cover border border-bg-3"
      style={dimension}
    />
  ) : (
    <div
      className={
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0 " +
        (interactive ? "transition-opacity hover:opacity-85 " : "") +
        className
      }
      style={{ ...dimension, background: color, color: onColor, fontSize }}
    >
      {initial}
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={
          "inline-block rounded-full " +
          (interactive ? "focus:outline-none focus:ring-2 focus:ring-accent/50 " : "") +
          className
        }
        style={dimension}
        title={name ? `View ${name}'s profile` : "View profile"}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
