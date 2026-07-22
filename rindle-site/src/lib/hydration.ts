import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** False for SSR and the browser's matching hydration pass, then true immediately afterward. On
 * client-side navigation it is true on the first render. Use this when client-only session state
 * changes markup that was rendered without a request-bound session on the server. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
