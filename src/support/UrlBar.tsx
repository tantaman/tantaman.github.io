/**
 * based on application state, render the URL hash.
 * This prevents us from breaking layers of abstraction.
 * Requiring components to update the URL would require them to be aware
 * of all other components that also try to save state in the URL
 * so they don't munge it.
 */

import { SiteState } from './Domain';

// As a react component so life-cycle and batching of updates are handled for us
export default function UrlBar({ state }: { state: SiteState }) {
  history.pushState(state, '', '/' + state.section);

  return null;
}
