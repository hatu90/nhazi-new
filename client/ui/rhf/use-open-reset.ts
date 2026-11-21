import { useEffect, useRef } from "react";

/**
 * A page-level form outlives the modal that shows it, so put it back to a clean state each time the modal opens (`reset` =
 * `form.reset(defaults)` + `save.reset()` + any local state). Re-runs when `key` changes while open (e.g. another row is edited).
 */
export function useOpenReset(open: boolean, reset: () => void, key?: unknown) {
  const latest = useRef(reset);
  // keep the newest `reset` (its closure sees the current props) without re-running the effect when it changes
  useEffect(() => {
    latest.current = reset;
  });
  useEffect(() => {
    if (open) latest.current();
  }, [open, key]);
}
