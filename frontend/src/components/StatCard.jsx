import React from "react";
import { CountUp, HoverLift } from "./motion/Motion.jsx";

/**
 * A stat tile - the right form when the story is a single number.
 * Numeric values count up once the tile scrolls into view; anything
 * non-numeric (dates, ranges, "—") is printed as given.
 */
export default function StatCard({ icon, label, value, unit, sub, iconBg = "var(--icon-chip)" }) {
  const numeric = typeof value === "number" && Number.isFinite(value);
  const decimals = numeric && !Number.isInteger(value) ? 1 : 0;

  return (
    <HoverLift className="card stat-card">
      <div className="stat-icon-wrapper" style={{ backgroundColor: iconBg }}>
        {typeof icon === "string" ? <span className="stat-emoji">{icon}</span> : icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">
          {numeric ? <CountUp value={value} decimals={decimals} /> : value}
          {unit && <span className="unit"> {unit}</span>}
        </div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </HoverLift>
  );
}
