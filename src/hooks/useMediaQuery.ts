// ---------------------------------------------------------------------------
// useMediaQuery — subscribe to a CSS media query and re-render on change.
//
// Usage:
//   const isMobile = useMediaQuery("(max-width: 768px)");
//
// The hook is SSR-safe (returns false during the first render if
// `window` is undefined) and cleans up its listener on unmount.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);

    // Sync immediately in case the query changed between mount and effect.
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    // addEventListener is the modern API; older Safari used addListener.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else {
      // Safari < 14 fallback.
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, [query]);

  return matches;
}
