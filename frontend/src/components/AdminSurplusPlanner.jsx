import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Scale, Sparkles, Store } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLiveData } from "../hooks/useLiveData.js";
import LottieState from "./LottieState.jsx";
import { ChartTooltip, useChartPalette } from "./charts/ChartKit.jsx";
import { GrowBar, useReducedMotion } from "./motion/Motion.jsx";
import {
  buildForecast,
  fmtKg,
  fmtLong,
  ForecastHeatmap,
  ForecastKpis,
  ForecastStackedChart,
  ListingPlan,
  Toggle,
} from "./forecast/ForecastParts.jsx";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
];
const VIEWS = [
  { value: "calendar", label: "Calendar" },
  { value: "chart", label: "Chart" },
];

/**
 * Platform-wide surplus planning for admins (/ai/admin/overview): the
 * combined forecast across every donor, which donors it comes from so pickups
 * can be planned, and whether verified beneficiaries can absorb it day by day.
 */
export default function AdminSurplusPlanner() {
  const [days, setDays] = useState(7);
  const [view, setView] = useState("calendar");
  const { data, error } = useLiveData(`/ai/admin/overview?daysAhead=${days}`, { intervalMs: 60000 });
  const { data: model } = useLiveData("/ai/model", { intervalMs: 300000 });
  const { data: settingsData } = useLiveData("/settings", { intervalMs: 300000 });

  const forecast = buildForecast(data?.forecast?.daily);

  return (
    <>
      <div className="card ai-cal">
        <div className="card-title ai-cal-head">
          <h3 className="section-title-with-leaf" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color="var(--primary)" />
            Platform Surplus Forecast
          </h3>
          <div className="fc-controls">
            <Toggle options={VIEWS} value={view} onChange={setView} label="View" />
            <Toggle options={RANGES} value={days} onChange={setDays} label="Forecast horizon" />
          </div>
        </div>
        <p className="ai-cal-sub">Surplus the trained model expects across all donors, by category and day.</p>

        {!data && !error && (
          <LottieState title="Running the model" message="Forecasting surplus across all donors…" size={110} />
        )}
        {error && !data && (
          <LottieState title="Forecast unavailable" message="The AI service did not respond. It will retry shortly." size={110} />
        )}
        {data && !forecast.rows.length && (
          <LottieState
            title="No forecast yet"
            message="No donor has inventory history yet, or the trained model is offline."
            size={110}
          />
        )}

        {forecast.rows.length > 0 && (
          <>
            <ForecastKpis
              forecast={forecast}
              previousPeriodKg={data.forecast.previousPeriodKg}
              days={days}
              model={model}
            />
            {view === "calendar" ? <ForecastHeatmap forecast={forecast} /> : <ForecastStackedChart forecast={forecast} />}
            <ListingPlan forecast={forecast} settings={settingsData?.settings} title="Expiry pressure by category" />
            {data.forecast.note && <p className="ai-cal-note">{data.forecast.note}</p>}
          </>
        )}
      </div>

      {data && forecast.rows.length > 0 && (
        <div className="fc-admin-grid">
          <TopDonors donors={data.donors} days={days} />
          <CapacityCheck capacity={data.capacity} />
        </div>
      )}
    </>
  );
}

/** Donors ranked by forecast surplus, so pickups can be lined up where most food will appear. */
function TopDonors({ donors, days }) {
  const max = Math.max(...donors.map((d) => d.totalKg), 0.0001);
  return (
    <div className="card fc-panel">
      <div className="ad-card-head">
        <h3>
          <span className="ad-card-icon"><Store size={17} color="currentColor" /></span> Most surplus expected
        </h3>
        <span className="ad-chip">Next {days} days</span>
      </div>
      {!donors.length ? (
        <p className="fc-empty">No donor has inventory history yet.</p>
      ) : (
        <ol className="fc-donors">
          {donors.slice(0, 6).map((d, i) => (
            <li key={d.donorId}>
              <span className="fc-rank">{i + 1}</span>
              <div className="fc-donor-body">
                <div className="fc-donor-top">
                  <strong>{d.name}</strong>
                  <span className="fc-donor-kg">{fmtKg(d.totalKg)}</span>
                </div>
                <GrowBar percent={(d.totalKg / max) * 100} height={6} />
                <span className="fc-donor-meta">
                  {[
                    d.location,
                    d.topCategory && `mostly ${d.topCategory}`,
                    d.peakDate && `busiest ${fmtLong(d.peakDate)} (${fmtKg(d.peakKg)})`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Rounds up to 4 x a 1/2/2.5/5 step, so the five y-axis ticks land on round kg values. */
function niceMax(v) {
  const raw = Math.max(v, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return step * 4;
}

/**
 * Expected surplus per day against what verified beneficiaries say they can
 * handle. Both are kg, so one axis carries them: bars for surplus, a
 * reference line for capacity. A day over the line is marked with an icon
 * and a sentence, not colour alone.
 */
function CapacityCheck({ capacity }) {
  const palette = useChartPalette();
  const reduced = useReducedMotion();
  const cap = capacity.dailyCapacityKg;
  const data = capacity.days.map((d) => ({ ...d, label: fmtLong(d.date) }));
  const short = data.filter((d) => d.shortfallKg > 0);
  const busiest = data.reduce((a, b) => (b.surplusKg > (a?.surplusKg ?? -1) ? b : a), null);
  const tick = { fontSize: 11, fill: palette.inkMuted };
  const top = niceMax(Math.max(cap, ...data.map((d) => d.surplusKg)) * 1.08);

  return (
    <div className="card fc-panel">
      <div className="ad-card-head">
        <h3>
          <span className="ad-card-icon"><Scale size={17} color="currentColor" /></span> Surplus vs NGO capacity
        </h3>
        <span className="ad-chip">{capacity.organizations} verified</span>
      </div>

      {short.length ? (
        <p className="fc-verdict fc-verdict-warn">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            <strong>{fmtLong(short[0].date)}:</strong> {fmtKg(short[0].surplusKg)} expected, verified NGOs can take{" "}
            {fmtKg(cap)}. Find capacity for about <strong>{fmtKg(short[0].shortfallKg)}</strong> more
            {short.length > 1 ? `, and on ${short.length - 1} other day${short.length > 2 ? "s" : ""}` : ""}.
          </span>
        </p>
      ) : (
        <p className="fc-verdict fc-verdict-ok">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            Covered every day. Verified NGOs can take <strong>{fmtKg(cap)}</strong> a day
            {busiest && cap > 0 && (
              <>; the busiest day ({fmtLong(busiest.date)}) needs {fmtKg(busiest.surplusKg)}, {Math.round((busiest.surplusKg / cap) * 100)}% of that</>
            )}
            .
          </span>
        </p>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
          <CartesianGrid stroke={palette.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: palette.grid }}
            tickFormatter={(v) => v.split(",")[0]}
            interval="preserveStartEnd"
          />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={54} unit=" kg" domain={[0, top]} tickCount={5} />
          <Tooltip cursor={{ fill: "rgba(56, 126, 1, 0.07)" }} content={<ChartTooltip unit="kg" />} />
          <ReferenceLine
            y={cap}
            stroke={palette.ink}
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: `Capacity ${fmtKg(cap)}/day`, position: "insideTopRight", fontSize: 11, fill: palette.ink }}
          />
          <Bar
            dataKey="surplusKg"
            name="Expected surplus"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={!reduced}
            animationDuration={600}
          >
            {data.map((d) => (
              <Cell key={d.date} fill={d.shortfallKg > 0 ? palette.critical : palette.brand} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Expected surplus per day against daily NGO capacity of {cap} kg</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.label}</th>
              <td>{d.surplusKg} kg</td>
              <td>{d.shortfallKg > 0 ? `${d.shortfallKg} kg over capacity` : "within capacity"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
