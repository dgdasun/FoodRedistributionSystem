import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import { HorizontalBarChart } from "./charts/ChartKit.jsx";
import LiveBadge from "./LiveBadge.jsx";
import LottieState from "./LottieState.jsx";

const RANGES = [7, 14, 30];

/**
 * Surplus forecast from the Python AI service, via the Spring Boot proxy at
 * /api/ai/predict.
 *
 * The range buttons are not a client-side filter over one payload - each one
 * re-queries the model with a different horizon, so the numbers really are
 * the model's answer for that window.
 *
 * Every sentence under "What this suggests" is derived arithmetic over the
 * model's own output. Nothing here is invented copy.
 */
export default function AIForecastPanel({ showLive = true, framed = true }) {
  const [days, setDays] = useState(7);
  const { data, error, lastUpdated, isRefreshing, refresh } = useLiveData(
    `/ai/predict?daysAhead=${days}`,
    { intervalMs: 60000 }
  );

  const predictions = data?.predictions || null;
  const total = data?.totalPredictedKg ?? 0;

  let top = null;
  let share = 0;
  if (predictions) {
    const entries = Object.entries(predictions).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      top = { name: entries[0][0], kg: entries[0][1] };
      share = total > 0 ? Math.round((top.kg / total) * 100) : 0;
    }
  }

  return (
    <div className={framed ? "card" : ""}>
      <div
        className="card-title"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
      >
        <h3 className="section-title-with-leaf" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} color="var(--primary)" />
          AI Surplus Forecast
        </h3>
        {showLive && (
          <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
        )}
      </div>

      {/* Filters sit in one row above the plot. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--text-light)", marginRight: 2 }}>Horizon</span>
        {RANGES.map((r) => {
          const active = r === days;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={active}
              style={{
                position: "relative",
                padding: "5px 13px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                border: `1px solid ${active ? "var(--primary)" : "var(--card-border)"}`,
                background: active ? "var(--primary)" : "var(--white)",
                color: active ? "#fff" : "var(--text-mid)",
                transition: "background .18s ease, color .18s ease, border-color .18s ease",
              }}
            >
              {r} days
            </button>
          );
        })}
      </div>

      {!predictions && !error && (
        <LottieState title="Running the model" message="Fitting the forecast over historical inventory data…" size={120} />
      )}

      {error && !predictions && (
        <LottieState
          title="Forecast unavailable"
          message="The AI service did not respond. The badge above retries, or tap it to retry now."
          size={120}
        />
      )}

      {predictions && (
        <>
          {/* Keyed on the horizon so a range change animates rather than snapping. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={days}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <HorizontalBarChart data={predictions} height={260} unit="kg" />
            </motion.div>
          </AnimatePresence>

          <div
            style={{
              marginTop: 14,
              padding: "13px 15px",
              borderRadius: "var(--radius-sm)",
              background: "var(--sand-light)",
              border: "1px solid var(--sand)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <TrendingUp size={15} color="var(--clay)" />
              <strong style={{ fontSize: 13.5, color: "var(--text-dark)" }}>What this suggests</strong>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-mid)" }}>
              About <strong>{Math.round(total)} kg</strong> of surplus is expected over the next {days} days
              {top && (
                <>
                  , and <strong>{top.name}</strong> accounts for the largest share at{" "}
                  <strong>{share}%</strong> ({Math.round(top.kg)} kg). Line up beneficiaries who can take{" "}
                  {top.name.toLowerCase()} before it reaches its expiry window
                </>
              )}
              .
            </p>
            {data?.note && (
              <p style={{ fontSize: 11.5, color: "var(--text-light)", marginTop: 6 }}>{data.note}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
