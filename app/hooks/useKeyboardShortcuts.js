import { useEffect, useRef } from "react";

/**
 * Global shortcuts:  /  focus search   c  compose   Esc  close things
 * Pass the latest state + callbacks; the listener is only attached once.
 */
export function useKeyboardShortcuts(handlers) {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    function handleKeyDown(event) {
      const {
        authenticated,
        composeOpen,
        selectedMessage,
        sidebarOpen,
        openComposer,
        closeComposer,
        closeMessage,
        closeSidebar,
      } = latest.current;

      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;

      if (event.key === "/" && !isTyping && !composeOpen) {
        event.preventDefault();
        document.querySelector(".search-box input")?.focus();
        return;
      }

      if (
        event.key.toLowerCase() === "c" &&
        !hasModifier &&
        !isTyping &&
        !composeOpen &&
        authenticated
      ) {
        event.preventDefault();
        openComposer();
        return;
      }

      if (event.key === "Escape") {
        if (composeOpen) {
          closeComposer();
          return;
        }

        if (selectedMessage) {
          closeMessage();
          return;
        }

        if (sidebarOpen) {
          closeSidebar();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
