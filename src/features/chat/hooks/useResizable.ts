// ---------------------------------------------------------------------------
// useResizable — small hook for making a left-anchored panel draggable.
//
// Usage:
//   const { width, isResizing, onMouseDown } = useResizable({
//     initialWidth: 260, minWidth: 180, maxWidth: 480,
//     storageKey: "chat.sidebar_width",
//   });
//   <aside style={{ width }}>...</aside>
//   <div onMouseDown={onMouseDown} className="resize-handle" />
//
// The hook:
//   - Hydrates the initial width from localStorage (if a storageKey is given)
//     and clamps it to [min, max] so a stale value can't break the layout.
//   - On mousedown, sets `isResizing=true` and attaches window-level
//     mousemove/mouseup listeners (so the drag keeps working even when the
//     cursor leaves the handle).
//   - On mousemove, computes width = e.clientX (the sidebar starts at x=0).
//   - On mouseup, persists the final width and tears down the listeners.
//
// The `isResizing` flag is exposed so the caller can disable text selection
// or pointer events on adjacent elements during the drag.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizableOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  /** If set, the width is persisted to localStorage under this key. */
  storageKey?: string;
}

interface UseResizableResult {
  width: number;
  isResizing: boolean;
  /** Attach to onMouseDown of the drag handle. */
  onMouseDown: (e: React.MouseEvent) => void;
}

export function useResizable({
  initialWidth,
  minWidth,
  maxWidth,
  storageKey,
}: UseResizableOptions): UseResizableResult {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          const n = Number(saved);
          if (!Number.isNaN(n) && n >= minWidth && n <= maxWidth) return n;
        }
      } catch {
        // localStorage might be unavailable (private mode, etc.) — fall back.
      }
    }
    return initialWidth;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Keep the latest min/max/storageKey in a ref so the window listeners
  // (which are attached once) always see current values.
  const optsRef = useRef({ minWidth, maxWidth, storageKey });
  optsRef.current = { minWidth, maxWidth, storageKey };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    function onMove(e: MouseEvent) {
      const { minWidth, maxWidth } = optsRef.current;
      // Sidebar is anchored to the left edge of the viewport, so its width
      // equals the cursor's clientX. Clamp to keep it usable.
      const w = Math.min(maxWidth, Math.max(minWidth, e.clientX));
      setWidth(w);
    }

    function onUp() {
      setIsResizing(false);
      // Persist the final width. Using the functional updater so we grab
      // the latest value rather than a stale closure.
      const { storageKey } = optsRef.current;
      if (storageKey) {
        setWidth((w) => {
          try {
            localStorage.setItem(storageKey, String(w));
          } catch {
            // Ignore write failures (e.g. storage full / disabled).
          }
          return w;
        });
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  return { width, isResizing, onMouseDown };
}
