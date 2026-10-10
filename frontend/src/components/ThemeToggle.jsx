import React from "react";
import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../ThemeContext.jsx";

/**
 * Light/dark switch for the topbar.
 *
 * The icon shown is the theme you'd get by pressing it, not the one you're in
 * - that's the convention people expect from a single-button toggle, and the
 * label says it outright for anyone using a screen reader.
 */
export default function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useTheme();
  const reduced = useReducedMotion();
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      <motion.span
        key={isDark ? "sun" : "moon"}
        initial={reduced ? false : { rotate: -45, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ display: "flex" }}
      >
        <Icon size={18} />
      </motion.span>
    </button>
  );
}
