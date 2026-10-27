import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlarmClock, ArrowDownRight, ArrowUpRight, CalendarCheck, CalendarClock, Clock, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ruleFor } from "../../alertEngine.js";
import { useTheme } from "../../ThemeContext.jsx";
import { ChartTooltip, useChartPalette } from "../charts/ChartKit.jsx";
import { CountUp, motion, useReducedMotion } from "../motion/Motion.jsx";

/*
 * Pieces shared by the donor's AI Surplus Calendar and the admin's platform
 * planner. Both read the same /ai/predict response shape, so the grid, chart,
 * KPI row and listing plan render identically whichever scope fed them.
 */

export const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
export const fmtNum = (iso) => new Date(`${iso}T00:00:00`).getDate();
export const fmtLong = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const fmtKg = (kg) => `${Math.round(kg).toLocaleString()} kg`;

/** Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC). */
export const isoLocal = (d) => d.toLocaleDateString("en-CA");

/** "Monday" when it falls in the coming week, "Monday, Nov 9" further out - so a name is never ambiguous. */
export function dayName(iso) {
  const ahead = (new Date(`${iso}T00:00:00`) - new Date(`${isoLocal(new Date())}T00:00:00`)) / 86_400_000;
  return ahead < 7 ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }) : fmtLong(iso);
}

/** Plain-words summary of a forecast, shared by the Food Forecast page and its dashboard card. */
export function forecastSentence(forecast, days) {
  if (!forecast.rows.length) return null;
  const peak = forecast.dayTotals.reduce((a, b) => (b.kg > a.kg ? b : a));
  return `In the next ${days} days about ${fmtKg(forecast.total)} of your food may go unsold. ${dayName(peak.date)} is likely to be the busiest day.`;
}

/**
 * Colour follows the category, never its rank, so a category keeps its hue
 * when the horizon changes and the sort order shifts. Six known categories
 * map to the six --fc-* tokens (validated light and dark in ai.css);
 * anything else shares the neutral "other" token.
 */
const CATEGORY_ORDER = ["Vegetables", "Fruits", "Dairy", "Bakery", "Cooked Meals", "Packaged Goods"];
const seriesToken = (category) => {
  const i = CATEGORY_ORDER.indexOf(category);
  return i < 0 ? "--fc-other" : `--fc-${i + 1}`;
};

/** Recharts writes fills as SVG attributes, so tokens are resolved to hex per theme. */
function useSeriesColors(categories) {
  const { theme } = useTheme();
  return useMemo(() => {
    const cs = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
    const out = {};
    for (const c of categories) out[c] = cs?.getPropertyValue(seriesToken(c)).trim() || "#5C6654";
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, categories.join("|")]);
}

/** daily (category -> [{date, quantityKg}]) -> rows sorted by total, plus the shared date axis and day totals. */
export function buildForecast(daily) {
  const rows = daily
    ? Object.entries(daily)
        .filter(([, d]) => d.length)
        .map(([category, d]) => {
          const max = Math.max(...d.map((x) => x.quantityKg));
          const peak = d.find((x) => x.quantityKg === max);
          const total = d.reduce((s, x) => s + x.quantityKg, 0);
          return { category, days: d, max, peak, total };
        })
        .sort((a, b) => b.total - a.total)
    : [];
  const dates = rows[0]?.days.map((d) => d.date) || [];
  const dayTotals = dates.map((date, i) => ({
    date,
    kg: rows.reduce((s, r) => s + (r.days[i]?.quantityKg || 0), 0),
  }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  return { rows, dates, dayTotals, total };
}

/** Pill group used for both the horizon and the Calendar / Chart switch. */
export function Toggle({ options, value, onChange, label }) {
  return (
    <div className="ai-cal-ranges" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={o.value === value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Change against the same number of recorded days. Surplus going up is not
 * good or bad in itself (more to redistribute, more at risk), so the arrow
 * stays in neutral ink rather than a status colour.
 */
function Trend({ now, before, label }) {
  if (before == null || before <= 0) return <span className="fc-kpi-sub">{label}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className="fc-kpi-sub">
      <span className="fc-trend">
        <Icon size={14} aria-hidden="true" />
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>{" "}
      {label}
    </span>
  );
}

/** Four headline numbers over the forecast: how much, when, what, and how far to trust it. */
export function ForecastKpis({ forecast, previousPeriodKg, days, model }) {
  const { rows, dayTotals, total } = forecast;
  const peakDay = dayTotals.reduce((a, b) => (b.kg > (a?.kg ?? -1) ? b : a), null);
  const top = rows[0];
  const share = top && total > 0 ? Math.round((top.total / total) * 100) : 0;
  const mae = model?.mae;
  const better = mae && model?.baselineMae ? model.baselineMae / mae : null;

  const cards = [
    {
      label: `Surplus, next ${days} days`,
      value: <><CountUp value={Math.round(total)} /> <small>kg</small></>,
      sub: <Trend now={total} before={previousPeriodKg} label={`vs last ${days} recorded days`} />,
    },
    {
      label: "Peak day",
      value: peakDay ? fmtLong(peakDay.date) : "—",
      sub: peakDay && (
        <span className="fc-kpi-sub">
          <span className="fc-trend"><ArrowUpRight size={14} aria-hidden="true" />{fmtKg(peakDay.kg)}</span>{" "}
          {total > 0 ? `${Math.round((peakDay.kg / total) * 100)}% of the period` : ""}
        </span>
      ),
    },
    {
      label: "Largest category",
      value: top ? top.category : "—",
      sub: top && <span className="fc-kpi-sub">{fmtKg(top.total)} · {share}% of all surplus</span>,
    },
    {
      label: "Model accuracy",
      value: mae != null ? <>±<CountUp value={mae} decimals={1} /> <small>kg</small></> : "—",
      sub: mae != null ? (
        <span className="fc-kpi-sub">
          {better && (
            <span className="fc-trend">
              <ArrowDownRight size={14} aria-hidden="true" />
              {better.toFixed(1)}× lower error
            </span>
          )}{" "}
          than a 7-day average · {model.model}
        </span>
      ) : (
        <span className="fc-kpi-sub">{model?.available === false ? "AI service offline" : "Not scored yet"}</span>
      ),
    },
  ];

  return (
    <div className="fc-kpis">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          className="fc-kpi"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
        >
          <span className="fc-kpi-label">{c.label}</span>
          <strong className="fc-kpi-value">{c.value}</strong>
          {c.sub}
        </motion.div>
      ))}
    </div>
  );
}

/** 7- or 14-point trend line for one category row; scaled to its own row like the cell shading. */
function Sparkline({ values }) {
  const w = 72;
  const h = 22;
  const max = Math.max(...values, 0.0001);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)]);
  const last = pts[pts.length - 1];
  return (
    <svg className="fc-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" />
    </svg>
  );
}

/**
 * Category x day heatmap. Shade is relative WITHIN a row: the question a
 * donor asks is "which day will my dairy pile up?", not "is dairy bigger
 * than bakery?" (the totals column answers that). The peak day of each row
 * is outlined as well as darkest, so the answer never rests on colour alone,
 * and every cell prints its kg value.
 */
export function ForecastHeatmap({ forecast }) {
  const { rows, dates } = forecast;
  const [hover, setHover] = useState(null);
  const reduced = useReducedMotion();

  return (
    <>
      <div className="ai-cal-scroll">
        <table className="ai-cal-grid">
          <caption className="sr-only">
            Forecast surplus in kg per category and day. Shading is relative within each row; the outlined cell is
            that category's peak day.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="ai-cal-cat">Category</th>
              {dates.map((d) => (
                <th scope="col" key={d}>
                  <span className="ai-cal-dow">{fmtDay(d)}</span>
                  <span className="ai-cal-dnum">{fmtNum(d)}</span>
                </th>
              ))}
              <th scope="col" className="ai-cal-total">Total</th>
              <th scope="col" className="ai-cal-total fc-spark-col">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.category}>
                <th scope="row" className="ai-cal-cat">
                  <span className="fc-swatch" style={{ background: `var(${seriesToken(row.category)})` }} />
                  {row.category}
                </th>
                {row.days.map((d, ci) => {
                  const t = row.max > 0 ? d.quantityKg / row.max : 0;
                  const isPeak = d === row.peak;
                  // The grid scrolls sideways on phones, which would clip an
                  // absolutely positioned tooltip, so it is placed fixed.
                  const show = (e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ x: r.left + r.width / 2, y: r.top, row, d, isPeak });
                  };
                  return (
                    <td key={d.date}>
                      <motion.div
                        className={`ai-cal-cell${isPeak ? " peak" : ""}`}
                        style={{ "--mix": `${Math.round(6 + t * 54)}%` }}
                        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.28, delay: Math.min(0.9, (ri * row.days.length + ci) * 0.012) }}
                        tabIndex={0}
                        onMouseEnter={show}
                        onMouseLeave={() => setHover(null)}
                        onFocus={show}
                        onBlur={() => setHover(null)}
                        aria-label={`${row.category}, ${fmtLong(d.date)}: ${d.quantityKg} kg${isPeak ? ", peak day" : ""}`}
                      >
                        {Math.round(d.quantityKg)}
                      </motion.div>
                    </td>
                  );
                })}
                <td className="ai-cal-total">{fmtKg(row.total)}</td>
                <td className="ai-cal-total fc-spark-col">
                  <Sparkline values={row.days.map((d) => d.quantityKg)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Portaled: the dashboard's FadeIn leaves a transform on its
          wrapper, and a transformed ancestor would anchor position:fixed. */}
      {hover &&
        createPortal(
          <div className="ai-cal-tip" role="tooltip" style={{ left: hover.x, top: hover.y }}>
            <span>{fmtLong(hover.d.date)} · {hover.row.category}</span>
            <strong>
              {hover.d.quantityKg.toFixed(1)} kg{hover.isPeak ? " · peak day" : ""}
            </strong>
          </div>,
          document.body
        )}

      <div className="ai-cal-legend" aria-hidden="true">
        <span>Less</span>
        {[6, 20, 34, 47, 60].map((m) => (
          <i key={m} style={{ "--mix": `${m}%` }} />
        ))}
        <span>More (within each row)</span>
        <i className="peak-swatch" />
        <span>Peak day</span>
      </div>
    </>
  );
}

/** The same forecast as one stacked bar per day: how big each day is overall, and what it is made of. */
export function ForecastStackedChart({ forecast, height = 300 }) {
  const { rows, dates } = forecast;
  const palette = useChartPalette();
  const reduced = useReducedMotion();
  // Stack in the fixed category order so a segment never jumps position between horizons.
  const cats = [...rows.map((r) => r.category)].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const colors = useSeriesColors(cats);
  const data = dates.map((date, i) => {
    const point = { label: fmtLong(date) };
    for (const r of rows) point[r.category] = Math.round((r.days[i]?.quantityKg || 0) * 10) / 10;
    return point;
  });
  const tick = { fontSize: 11, fill: palette.inkMuted };

  return (
    <div className="fc-chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 14, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={palette.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: palette.grid }}
            tickFormatter={(v) => v.split(",")[0] + " " + v.split(" ").pop()}
            interval="preserveStartEnd"
          />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={54} unit=" kg" />
          <Tooltip cursor={{ fill: "rgba(56, 126, 1, 0.07)" }} content={<ChartTooltip unit="kg" />} />
          <Legend
            iconType="square"
            iconSize={10}
            // top segment first, so the legend reads in the same order as the stack
            itemSorter={(item) => -cats.indexOf(item.value)}
            wrapperStyle={{ fontSize: 12, color: palette.ink, paddingTop: 6 }}
            formatter={(v) => <span style={{ color: palette.ink }}>{v}</span>}
          />
          {cats.map((c, i) => (
            <Bar
              key={c}
              dataKey={c}
              name={c}
              stackId="day"
              fill={colors[c]}
              stroke={palette.surface}
              strokeWidth={2}
              radius={i === cats.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={46}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Forecast surplus per day and category, kg</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {cats.map((c) => <th scope="col" key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              {cats.map((c) => <td key={c}>{d[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "6 h", "2 days", "1 week" - the near-expiry window in the unit a donor thinks in. */
export function fmtHours(h) {
  if (h < 24) return `${h} h`;
  if (h % 168 === 0) return `${h / 168} week${h === 168 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/**
 * How little slack a category's near-expiry window leaves. Status colour
 * always ships with an icon and a word, never alone.
 */
export function urgencyFor(hours) {
  if (hours < 24) return { tone: "urgent", label: "List same day", Icon: AlarmClock };
  if (hours <= 72) return { tone: "soon", label: "List within days", Icon: Clock };
  return { tone: "calm", label: "Flexible", Icon: CalendarCheck };
}

/**
 * Each category's peak paired with the admin-configured near-expiry window
 * for that category (System Settings), which is what turns a forecast into an
 * instruction: when to list it so NGOs can still collect.
 */
export function ListingPlan({ forecast, settings, title = "Plan your listings" }) {
  return (
    <>
      <h4 className="ai-cal-plan-title">
        <CalendarClock size={16} color="var(--primary)" />
        {title}
      </h4>
      <ul className="ai-cal-plan">
        {forecast.rows.map((row) => {
          const rule = ruleFor(row.category, settings);
          const u = urgencyFor(rule.expiryThresholdHours);
          return (
            <li key={row.category} className={`fc-plan-${u.tone}`}>
              <div>
                <strong>{row.category}</strong>
                <span className={`fc-urgency fc-urgency-${u.tone}`}>
                  <u.Icon size={13} aria-hidden="true" />
                  {u.label}
                </span>
              </div>
              <span className="ai-cal-plan-peak">
                Peak {fmtLong(row.peak.date)} · {row.peak.quantityKg.toFixed(1)} kg
              </span>
              <p>
                Counts as near-expiry <strong>{fmtHours(rule.expiryThresholdHours)}</strong> before its expiry date.
                List it as soon as it enters that window; NGOs then have{" "}
                <strong>{fmtHours(rule.collectionWindowHours)}</strong> to collect.
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
