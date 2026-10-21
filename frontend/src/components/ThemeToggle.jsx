import React, { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "../ThemeContext.jsx";
import "../styles/theme.css";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "Bright and clear", Icon: Sun },
  { value: "dark", label: "Dark", hint: "Easier on the eyes at night", Icon: Moon },
  { value: "system", label: "System", hint: "Match your device setting", Icon: Monitor },
];

/**
 * Appearance menu for the topbar.
 *
 * A single sun/moon toggle hides the "follow my device" option and makes people
 * guess what the icon means, so the button opens a small menu with all three
 * choices spelled out. The button icon shows the theme currently in effect.
 */
export default function ThemeToggle({ className = "" }) {
  const { isDark, mode, setMode } = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const Icon = mode === "system" ? Monitor : isDark ? Moon : Sun;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`theme-toggle ${className}`.trim()}
        aria-label="Appearance"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Appearance"
      >
        <motion.span
          key={`${mode}-${isDark}`}
          initial={reduced ? false : { rotate: -45, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ display: "flex" }}
        >
          <Icon size={18} />
        </motion.span>
      </button>

      {open && (
        <div className="theme-menu" role="menu" aria-label="Appearance">
          <div className="theme-menu-head">Appearance</div>
          {THEME_OPTIONS.map(({ value, label, hint, Icon: OptIcon }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`theme-menu-item${active ? " is-active" : ""}`}
                onClick={() => {
                  setMode(value);
                  setOpen(false);
                }}
              >
                <span className="theme-menu-icon">
                  <OptIcon size={16} />
                </span>
                <span className="theme-menu-text">
                  <strong>{label}</strong>
                  <span>{hint}</span>
                </span>
                {active && <Check size={16} className="theme-menu-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Larger picker with a mini preview of each theme, for the Profile page.
 */
export function AppearancePicker() {
  const { mode, setMode, isDark } = useTheme();
  return (
    <div className="appearance-grid" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map(({ value, label, hint, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`appearance-option${active ? " is-active" : ""}`}
            onClick={() => setMode(value)}
          >
            <span className={`appearance-preview p-${value}`} aria-hidden="true">
              <span className="ap-side" />
              <span className="ap-main">
                <span className="ap-bar" />
                <span className="ap-card" />
                <span className="ap-card short" />
              </span>
            </span>
            <span className="appearance-label">
              <Icon size={15} />
              {label}
              {active && <Check size={15} className="appearance-check" />}
            </span>
            <span className="appearance-sub">
              {value === "system" && active ? `Your device is using ${isDark ? "dark" : "light"}` : hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
