import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Light/dark theme.
 *
 * The whole palette lives in CSS custom properties (see the token block at the
 * top of index.css), so switching themes is only ever "write a different value
 * for data-theme on <html>". Nothing here knows a single colour.
 *
 * Two deliberate choices:
 *
 *  - The attribute is ALWAYS written explicitly, even when the user has never
 *    picked a theme - we resolve the OS preference ourselves and write the
 *    result. That way index.css needs one `:root[data-theme="dark"]` block
 *    instead of also duplicating it inside a `prefers-color-scheme` media
 *    query, and the two can never drift apart.
 *  - Until the user picks, we keep following the OS. Once they pick, their
 *    choice is stored and the OS is ignored - an explicit choice outranks an
 *    inherited default.
 */

const STORAGE_KEY = "foodshare-theme";
const ThemeContext = createContext(null);

function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function storedTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    // Private mode / blocked storage - fall back to following the OS.
    return null;
  }
}

export function ThemeProvider({ children }) {
  // `null` means "no explicit choice yet, follow the OS".
  const [choice, setChoice] = useState(storedTheme);
  const [system, setSystem] = useState(systemTheme);

  const theme = choice ?? system;

  // Keep following the OS while the user hasn't chosen.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystem(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    // Lets the browser theme scrollbars, form controls and the like. The CSS
    // sets this too; doing it here keeps them in step before first paint.
    root.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback((next) => {
    setChoice(next);
    try {
      if (next === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice shouldn't break the toggle.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggle,
      setTheme,
      followSystem: choice === null,
      // What the user picked, for pickers: "light" | "dark" | "system".
      mode: choice ?? "system",
      setMode: (m) => setTheme(m === "system" ? null : m),
    }),
    [theme, toggle, setTheme, choice]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
