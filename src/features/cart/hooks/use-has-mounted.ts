import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;

/**
 * Safe localStorage hydration: the server renders with an empty cart, so any
 * value derived from the persisted store must not appear until after
 * hydration — otherwise React reports a markup mismatch. useSyncExternalStore
 * returns the server snapshot (false) during SSR and hydration, then the
 * client snapshot (true), which is exactly the switch we need.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
