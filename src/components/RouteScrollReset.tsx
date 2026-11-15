import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/** Every section visit (including reselecting its menu item) starts at the top. */
export function RouteScrollReset() {
  const location = useLocation();
  const previousLocation = useRef<typeof location | null>(null);

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = location;

    // Keep local controls such as altar details from jumping when only a query/hash changes.
    if (previous?.pathname === location.pathname
      && (previous.search !== location.search || previous.hash !== location.hash)) return;

    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    reset();
    // Reapply after the browser commits the new page's layout/focus changes.
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return null;
}
