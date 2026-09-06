import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Admin-only theme state — completely separate from the public site theme.
 *
 * The public site's theme lives in `src/lib/theme.tsx` under the `'theme'`
 * localStorage key and represents the *visitor's* preference. This provider
 * exists so that the admin dashboard's dark-mode toggle NEVER modifies the
 * public/visitor preference. It persists to its own key
 * (`frelux_admin_theme`) and only owns the `dark` class on
 * `document.documentElement` while the admin surface is mounted; on unmount
 * it restores the public theme so navigating back to the public site keeps
 * the visitor's own preference intact.
 */

type Theme = "light" | "dark";

/** localStorage key for the ADMIN dashboard theme (never read by the public site). */
const ADMIN_THEME_KEY = "frelux_admin_theme";
/** localStorage key of the PUBLIC site theme (owned by src/lib/theme.tsx). */
const PUBLIC_THEME_KEY = "theme";

interface AdminThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});

function readStoredTheme(key: string): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(key);
  return stored === "light" || stored === "dark" ? stored : null;
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Apply (or clear) the `dark` class on <html>. */
function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/** Resolve the PUBLIC theme preference the way the public provider does. */
function readPublicTheme(): Theme {
  return readStoredTheme(PUBLIC_THEME_KEY) ?? (prefersDark() ? "dark" : "light");
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return readStoredTheme(ADMIN_THEME_KEY) ?? (prefersDark() ? "dark" : "light");
  });

  useEffect(() => {
    // Own the <html> dark class while the admin surface is mounted, and
    // persist ONLY to the admin key — the public 'theme' key is untouched.
    applyThemeClass(theme);
    window.localStorage.setItem(ADMIN_THEME_KEY, theme);
    // On unmount, hand the dark class back to the public theme so the
    // visitor's stored preference governs the public site again.
    return () => {
      applyThemeClass(readPublicTheme());
    };
  }, [theme]);

  function toggle() {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function setTheme(t: Theme) {
    setThemeState(t);
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
