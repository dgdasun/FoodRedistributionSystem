import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * How much time an item has left before it expires.
 *
 * The percentage is real, not decorative: it is the API's own
 * `daysUntilExpiry` on a shared 7-day scale. There is deliberately no "Fresh"
 * tier - this platform only carries near-expiry surplus and expired stock, so
 * an item that far from expiry cannot be listed in the first place.
 */
/** Common scale, in days, so a bar means the same thing in every category. */
const SCALE_DAYS = 7;

export function freshnessOf(item) {
  const days = Number(item?.daysUntilExpiry);

  if (!Number.isFinite(days) || days < 0) {
    return { key: "expired", label: "Expired", percent: 0, color: "var(--danger)", tint: "var(--status-danger-bg)" };
  }

  // Measured against a fixed 7-day scale rather than the category's own
  // window: a bakery item with a 1-day window would otherwise show a FULL bar
  // while being hours from expiry, which reads as the opposite of urgent.
  const percent = Math.max(4, Math.min(100, Math.round((days / SCALE_DAYS) * 100)));

  if (days <= 1) {
    return { key: "urgent", label: "Urgent", percent, color: "var(--status-warn-fg)", tint: "var(--status-warn-bg)" };
  }
  return { key: "soon", label: "Expiring soon", percent, color: "var(--warning)", tint: "var(--status-warn-bg)" };
}

export default function FreshnessMeter({ item, showLabel = true }) {
  const reduced = useReducedMotion();
  const f = freshnessOf(item);

  return (
    <div>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: f.color }}>{f.label}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>
            {f.key === "expired"
              ? "past expiry"
              : `${item.daysUntilExpiry} day${item.daysUntilExpiry === 1 ? "" : "s"} left`}
          </span>
        </div>
      )}
      <div
        style={{ background: f.tint, borderRadius: 999, height: 7, overflow: "hidden" }}
        role="img"
        aria-label={
          f.key === "expired"
            ? "Past expiry"
            : `${f.label}: ${item.daysUntilExpiry} of ${SCALE_DAYS} days remaining` +
              (item.expiryThresholdDays ? `, collection window ${item.expiryThresholdDays} day(s)` : "")
        }
      >
        <motion.div
          style={{ height: 7, borderRadius: 999, background: f.color }}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${f.percent}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
