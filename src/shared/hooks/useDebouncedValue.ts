// ---------------------------------------------------------------------------
// useDebouncedValue — generic debounce hook.
//
// Returns a debounced copy of `value` that only updates after `delay` ms have
// elapsed without changes. Useful for search inputs: the debounced value is
// used as the trigger for the actual API call, so we don't fire one request
// per keystroke.
//
// The returned value is stable across re-renders as long as `value` doesn't
// change — the timer is cleared and reset on every change.
//
// Usage:
//   const [query, setQuery] = useState("");
//   const debouncedQuery = useDebouncedValue(query, 300);
//   useEffect(() => { if (debouncedQuery) search(debouncedQuery); }, [debouncedQuery]);
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after `delay` ms. Every time
    // `value` changes before the timer fires, the cleanup clears it — so only
    // the LAST change within the window wins.
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
