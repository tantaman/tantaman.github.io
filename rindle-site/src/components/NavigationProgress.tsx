import { useRouterState } from "@tanstack/react-router";

/** A cold route loader leaves the current screen in place. After a short CSS-only grace period,
 * show a thin indeterminate bar so that wait reads as navigation progress rather than a dead click. */
export function NavigationProgress() {
  const navigating = useRouterState({ select: (state) => state.isLoading });

  return (
    <div
      className="navigation-progress"
      data-active={navigating ? "" : undefined}
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={!navigating}
    />
  );
}
