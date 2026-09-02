"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * State persisted to localStorage, kept on the client on purpose.
 *
 * Behaviour logs, habit leaks and checklist state are a trader's private notes
 * about their own psychology. There is no reason for them to reach our server,
 * so they don't — they stay in the browser.
 *
 * Reads happen after mount so the server and client render the same initial
 * markup and hydration stays clean.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Private browsing or a corrupted entry: fall back to the initial value.
    }
    setLoaded(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(previous) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Session-only is an acceptable degradation.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, loaded] as const;
}
