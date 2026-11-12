import { useEffect, useRef } from "react";

/**
 * Calls `onEscape` when the user presses Escape.
 *
 * Every modal in the console closes itself when its backdrop is clicked, which
 * left keyboard users with no way out. Bind this to the same close function the
 * backdrop uses so both routes out of a dialog behave the same.
 */
export function useEscapeKey(onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handler.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export default useEscapeKey;
