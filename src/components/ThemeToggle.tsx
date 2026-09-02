"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

/**
 * The <head> script sets data-theme before first paint, so the DOM attribute —
 * not React — is the source of truth. useSyncExternalStore subscribes to it
 * directly; mirroring it into state via an effect causes cascading renders and
 * a hydration mismatch on the icon.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme =>
  (document.documentElement.dataset.theme as Theme) ?? "dark";

/** Dark is the default the server renders, matching layout.tsx. */
const getServerSnapshot = (): Theme => "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("assay-theme", next); } catch { /* private mode */ }
  }, []);

  const nextLabel = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${nextLabel} theme`}
      title={`Switch to ${nextLabel} theme`}
      className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full
                 text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
    >
      {/* drawn, one stroke weight — never an emoji standing in for an icon */}
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden
           stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        {theme === "light" ? (
          <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
        ) : (
          <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" />
          </>
        )}
      </svg>
    </button>
  );
}
