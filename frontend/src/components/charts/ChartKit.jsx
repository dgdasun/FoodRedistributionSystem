import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import LottieState from "../LottieState.jsx";
import { useTheme } from "../../ThemeContext.jsx";

/**
 * Recharts building blocks for the dashboards.
 *
 * Colour rules applied here (all verified with the palette validator rather
 * than picked by eye):
 *
 *  - Magnitude across categories uses ONE hue. The category name is already on
 *    the axis, so colour would only re-encode the bar length.
 *  - STATUS is the only place several hues appear. The trio below passes the
 *    lightness, chroma, normal-vision and contrast checks; its worst CVD pair
 *    sits in the 6-8 band, which is allowed only alongside a second cue - so
 *    every status mark also ships a written label and a 2px surface gap.
 */

/**
 * Recharts writes colours onto SVG presentation attributes (fill=, stroke=),
 * and those do not resolve `var()`. So instead of naming tokens in JSX we
 * resolve them off the document once per theme and hand Recharts real hex.
 *
 * useTheme() is what makes this reactive: the resolved values are recomputed
 * whenever data-theme flips, so charts repaint with the rest of the page.
 */
const CHART_TOKENS = {
  brand: "--chart-brand",
  surface: "--surface",
  ink: "--chart-ink",
  inkMuted: "--chart-ink-muted",
  grid: "--chart-grid",
  good: "--chart-good",
  warning: "--chart-warning",
  critical: "--chart-critical",
  neutral: "--chart-neutral",
};

/* Used if a token is missing (e.g. a chart rendered in a test harness with
   index.css not loaded) so charts degrade to the light palette, not to "". */
const FALLBACK = {
  brand: "#387E01",
  surface: "#FFFFFF",
  ink: "#3E4836",
  inkMuted: "#8A9482",
  grid: "#E9EFE1",
  good: "#15803D",
  warning: "#D97706",
  critical: "#9F1239",
  neutral: "#5C6654",
};

function readTokens() {
  if (typeof window === "undefined") return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const [key, prop] of Object.entries(CHART_TOKENS)) {
    out[key] = cs.getPropertyValue(prop).trim() || FALLBACK[key];
  }
  return out;
}

/** Theme-resolved chart palette. Recomputes when the theme changes. */
export function useChartPalette() {
  const { theme } = useTheme();
  return React.useMemo(() => {
    const t = readTokens();
    return {
      ...t,
      /** Reserved for good / warning / serious state - never "series N". */
      STATUS: { good: t.good, warning: t.warning, critical: t.critical, neutral: t.neutral },
    };
  }, [theme]);
}

/* Light-mode literals, kept for any caller that needs a colour outside React
   (and as the documented default). Inside components use useChartPalette(). */
export const BRAND = FALLBACK.brand;
export const SURFACE = FALLBACK.surface;

export const STATUS = {
  good: FALLBACK.good,
  warning: FALLBACK.warning,
  critical: FALLBACK.critical,
  neutral: FALLBACK.neutral,
};

/**
 * Fixed categorical order, for the day a genuinely multi-series chart appears.
 * Safe for neighbouring pairs; beyond ~4 slices at once, facet instead.
 */
export const CATEGORICAL = ["#2E7D32", "#1565C0", "#C55A11", "#8E24AA", "#0891B2", "#C2185B"];

const axisTickFor = (inkMuted) => ({ fontSize: 11, fill: inkMuted });

/** Shared tooltip shell - values sit in ink, a colour chip carries identity. */
function ChartTooltip({ active, payload, label, unit = "kg" }) {
  const palette = useChartPalette();
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--card-border)",
        borderRadius: 11,
        boxShadow: "var(--shadow-md)",
        padding: "9px 12px",
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 700, color: "var(--text-dark)", marginBottom: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} style={{ display: "flex", alignItems: "center", gap: 7, color: palette.ink }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: p.payload?.fill || p.color || palette.brand,
              flexShrink: 0,
            }}
          />
          {/* With one series the heading already names it - repeating it is noise. */}
          {payload.length > 1 && <span>{p.name}</span>}
          <strong style={{ color: "var(--text-dark)" }}>
            {Number(p.value).toLocaleString()} {unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

/** Screen-reader equivalent of any chart, so identity is never colour-alone. */
function DataTable({ caption, rows, unit = "kg" }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>
              {r.value} {unit}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * `compact` is for an empty row *inside* a populated card - there, a full
 * illustration shouts louder than the data around it, so it reduces to one
 * quiet line. The illustrated version is for a card that is empty outright.
 */
function EmptyPlot({
  title = "Nothing to chart yet",
  message = "This card fills in as soon as there is data to show.",
  compact = false,
}) {
  if (compact) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-light)", padding: "6px 0 2px" }}>{message}</p>
    );
  }
  return <LottieState title={title} message={message} size={120} />;
}

/**
 * Magnitude across named categories. One hue, hairline grid, hover tooltip.
 * Values live in the tooltip rather than on every bar.
 */
export function CategoryBarChart({ data, height = 360, xLabel = "Item", unit = "kg" }) {
  const reduced = useReducedMotion();
  const palette = useChartPalette();
  const axisTick = axisTickFor(palette.inkMuted);
  const rows = Object.entries(data || {}).map(([label, value]) => ({ label, value: Number(value) || 0 }));
  if (!rows.length) return <EmptyPlot />;

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 12, right: 16, bottom: 8, left: 8 }} barCategoryGap="28%">
          <CartesianGrid stroke={palette.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={92}
            tickMargin={8}
            tickLine={false}
            axisLine={{ stroke: palette.grid }}
            tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : v)}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={58}
            label={{ value: `Amount (${unit})`, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: palette.ink } }}
          />
          <Tooltip
            cursor={{ fill: "rgba(56, 126, 1, 0.07)" }}
            content={<ChartTooltip unit={unit} />}
          />
          <Bar
            dataKey="value"
            name={xLabel}
            fill={palette.brand}
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
            isAnimationActive={!reduced}
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
      <DataTable caption={`${xLabel} totals in ${unit}`} rows={rows} unit={unit} />
    </div>
  );
}

/**
 * Same job as CategoryBarChart, laid out horizontally.
 * Preferred when category names are long: they read straight across instead
 * of being rotated or truncated on the x-axis.
 */
export function HorizontalBarChart({ data, height = 300, unit = "kg", labelWidth = 118, sorted = true }) {
  const reduced = useReducedMotion();
  const palette = useChartPalette();
  const axisTick = axisTickFor(palette.inkMuted);
  // Ranked by size by default; pass sorted={false} for ordered data such as a time series.
  const rows = Object.entries(data || {}).map(([label, value]) => ({ label, value: Number(value) || 0 }));
  if (sorted) rows.sort((a, b) => b.value - a.value);
  if (!rows.length) return <EmptyPlot />;

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }} barCategoryGap="24%">
          <CartesianGrid stroke={palette.grid} strokeWidth={1} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: palette.grid }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={labelWidth}
          />
          <Tooltip cursor={{ fill: "rgba(56, 126, 1, 0.07)" }} content={<ChartTooltip unit={unit} />} />
          <Bar
            dataKey="value"
            name="Forecast"
            fill={palette.brand}
            radius={[0, 4, 4, 0]}
            maxBarSize={26}
            isAnimationActive={!reduced}
            animationDuration={700}
          />
        </BarChart>
      </ResponsiveContainer>
      <DataTable caption={`Forecast by category in ${unit}`} rows={rows} unit={unit} />
    </div>
  );
}

/**
 * Part-to-whole for a small number of STATUS segments. Direct labels and a 2px
 * surface ring give the second cue the colour check requires.
 */
export function StatusDonut({ segments, height = 300, unit = "requests", centerLabel }) {
  const reduced = useReducedMotion();
  const palette = useChartPalette();
  const rows = (segments || []).filter((s) => Number(s.value) >= 0);
  const total = rows.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  if (!rows.length || total <= 0) return <EmptyPlot />;

  return (
    <div style={{ width: "100%" }}>
      {/* The hero total sits in an HTML overlay rather than a Recharts <Label>:
          the polar viewBox has no cx/cy on first paint, which renders NaN. */}
      <div style={{ position: "relative", width: "100%", height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke={palette.surface}
              strokeWidth={2}
              isAnimationActive={!reduced}
              animationDuration={700}
            >
              {rows.map((s) => (
                <Cell key={s.key || s.label} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 27, fontWeight: 800, color: "var(--text-dark)", lineHeight: 1.1 }}>
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: 11.5, color: palette.inkMuted }}>{centerLabel || `total ${unit}`}</div>
        </div>
      </div>

      <Legend rows={rows} total={total} />
      <DataTable caption={centerLabel || `Breakdown by status in ${unit}`} rows={rows} unit={unit} />
    </div>
  );
}

/**
 * Two or three parts of a single whole, as one proportion bar.
 * Replaces the old two-point line chart, which implied a trend over time
 * between two categories that have no time relationship.
 */
export function ProportionBar({ segments, unit = "kg", height = 30, emptyText }) {
  const reduced = useReducedMotion();
  const rows = (segments || []).map((s) => ({ ...s, value: Number(s.value) || 0 }));
  const total = rows.reduce((sum, s) => sum + s.value, 0);
  if (!rows.length || total <= 0) {
    return <EmptyPlot compact message={emptyText || "No data recorded for this split yet."} />;
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", width: "100%", height, gap: 2, marginTop: 4 }}>
        {rows.map((s, i) => {
          const pct = (s.value / total) * 100;
          if (pct <= 0) return null;
          const first = i === 0;
          const last = i === rows.length - 1;
          return (
            <motion.div
              key={s.key || s.label}
              title={`${s.label}: ${s.value} ${unit} (${Math.round(pct)}%)`}
              style={{
                background: s.color,
                height,
                borderRadius: `${first ? 8 : 2}px ${last ? 8 : 2}px ${last ? 8 : 2}px ${first ? 8 : 2}px`,
                minWidth: 4,
              }}
              initial={reduced ? false : { width: 0 }}
              whileInView={reduced ? undefined : { width: `${pct}%` }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              animate={reduced ? { width: `${pct}%` } : undefined}
            />
          );
        })}
      </div>

      <Legend rows={rows} total={total} unit={unit} />
      <DataTable caption={`Split in ${unit}`} rows={rows} unit={unit} />
    </div>
  );
}

/** Written legend - always present, so colour is never the only cue. */
function Legend({ rows, total, unit }) {
  const palette = useChartPalette();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, marginTop: 16 }}>
      {rows.map((s) => {
        const pct = total ? Math.round((s.value / total) * 100) : 0;
        return (
          <div key={s.key || s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: s.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500, color: palette.ink }}>{s.label}</span>
            <strong style={{ color: "var(--text-dark)" }}>{pct}%</strong>
            <span style={{ color: "var(--text-light)", fontSize: 12 }}>
              ({s.value}
              {unit ? ` ${unit}` : ""})
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartTooltip };
