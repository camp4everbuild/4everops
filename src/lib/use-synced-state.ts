"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Local state that also resyncs when the seed prop changes — e.g. when
 * VisibilityRefresh triggers a router.refresh() and the server sends fresh
 * data as new props (realtime doesn't reliably survive the app being
 * backgrounded on mobile, so this is the catch-up path). Follows React's
 * documented "adjusting state when a prop changes" pattern — setState
 * during render, not in an effect — so it resyncs in the same render pass
 * instead of triggering an extra one.
 */
export function useSyncedState<T>(seed: T): [T, Dispatch<SetStateAction<T>>] {
  const [prevSeed, setPrevSeed] = useState(seed);
  const [value, setValue] = useState(seed);

  if (seed !== prevSeed) {
    setPrevSeed(seed);
    setValue(seed);
  }

  return [value, setValue];
}
