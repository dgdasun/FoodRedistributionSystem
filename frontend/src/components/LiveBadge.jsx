import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

function ago(ts) {
  if (!ts) return "connecting…";
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

/**
 * "Live · updated 12s ago" with a breathing dot.
 *
 * The label re-renders on its own one-second tick so the elapsed time stays
 * honest between polls, rather than freezing until the next fetch lands.
 */
export default function LiveBadge({ lastUpdated, isRefreshing, error, onRefresh }) {
  const reduced = useReducedMotion();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const live = !error;
  const dot = live ? "var(--primary)" : "var(--danger)";

  return (
    <button
      type="button"
      onClick={onRefresh}
      title={error ? "Reconnect" : "Refresh now"}
      className="live-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px 5px 10px",
        borderRadius: 999,
        border: "1px solid var(--card-border)",
        background: "var(--white)",
        color: "var(--text-mid)",
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 1.4,
        boxShadow: "var(--shadow)",
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
        <span
          style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "block" }}
        />
        {live && !reduced && (
          <motion.span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1.5px solid ${dot}`,
            }}
            animate={{ scale: [1, 2.1], opacity: [0.55, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </span>
      <span>
        {error ? "Reconnecting" : "Live"}
        <span style={{ color: "var(--text-light)" }}>
          {" · "}
          {isRefreshing ? "updating…" : ago(lastUpdated)}
        </span>
      </span>
    </button>
  );
}
