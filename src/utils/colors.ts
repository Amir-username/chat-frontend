// ---------------------------------------------------------------------------
// Per-user color assignment.
//
// Each user gets a stable color derived from their ID, so the same user is
// always the same color — across reloads, reconnects, and (since every client
// uses the same hash + palette) across all participants in a room.
//
// The palette is tuned for the dark theme: every color is bright enough to
// read against --bg-0 / --bg-2 but not so saturated that it hurts.
// ---------------------------------------------------------------------------

const PALETTE = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ef4444", // red
] as const;

/** Stable 32-bit hash of a string (djb2-ish). */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0; // force unsigned
}

/**
 * Return a hex color for the given user ID. The same ID always maps to the
 * same color, on every client.
 */
export function colorForUser(userId: number | string | undefined | null): string {
  if (userId === undefined || userId === null) return PALETTE[0];
  return PALETTE[hashStr(String(userId)) % PALETTE.length];
}

/**
 * Given a hex color like "#22c55e", return a readable text color (white or
 * near-black) for use on a filled background of that color. Uses the standard
 * luminance formula.
 */
export function readableTextOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (sRGB) — ITU-R BT.709 weights.
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#0b0d12" : "#ffffff";
}
