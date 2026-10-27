import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CloudOff,
  Database,
  HandHeart,
  RefreshCw,
  Scale,
  Server,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { useLiveData } from "../hooks/useLiveData.js";
import { useToast } from "../components/Toast.jsx";
import { SkeletonLine } from "../components/Skeleton.jsx";
import { ChartTooltip, HorizontalBarChart, useChartPalette } from "../components/charts/ChartKit.jsx";
import { CountUp, FadeIn, Stagger, StaggerItem, useReducedMotion } from "../components/motion/Motion.jsx";
import { buildForecast, dayName, fmtKg, fmtLong, ForecastHeatmap, Toggle } from "../components/forecast/ForecastParts.jsx";
import "../styles/forecast.css";
import "../styles/ai-insights.css";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
];
const TABS = [
  { key: "overview", label: "Overview", Icon: Sparkles },
  { key: "model", label: "Model", Icon: BrainCircuit },
];

/**
 * AI Insights for admins.
 *
 * Overview answers the planning questions in plain terms - how much surplus
 * is coming across all donors, whether verified NGOs can absorb it, who it
 * comes from, and whether allocations are being shared fairly. Model holds
 * the technical detail: service health, evaluation scores and retraining.
 */
export default function AdminAIInsights() {
  const [tab, setTab] = useState("overview");

  return (
    <>
      <div className="page-header">
        <h1>AI Insights</h1>
        <p>Where surplus is heading across the platform, and how the forecast behind it is performing.</p>
      </div>

      <div className="aii-tabs" role="tablist" aria-label="AI Insights sections">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`aii-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`aii-panel-${key}`}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`aii-panel-${tab}`} aria-labelledby={`aii-tab-${tab}`}>
        {tab === "overview" ? <OverviewTab /> : <ModelTab />}
      </div>
    </>
  );
}

function SectionHead({ icon, title, hint, estimate, action }) {
  return (
    <div className="ff-section-head aii-section-head">
      <div>
        <h2>
          <span className="ff-section-icon">{icon}</span>
          {title}
          {estimate && (
            <span className="ff-estimate">
              <Sparkles size={12} aria-hidden="true" /> AI estimate
            </span>
          )}
        </h2>
        {hint && <p>{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function ErrorCard({ onRetry, message }) {
  return (
    <div className="card ff-state" role="alert">
      <CloudOff size={28} aria-hidden="true" />
      <p>{message}</p>
      <button type="button" className="btn btn-outline btn-sm ff-retry" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>
  );
}

function CardSkeleton({ height = 220 }) {
  return (
    <div className="card" aria-hidden="true">
      <SkeletonLine width="35%" height={14} style={{ marginBottom: 14 }} />
      <SkeletonLine height={height} radius={12} />
    </div>
  );
}

/* ====================== Overview ====================== */

function OverviewTab() {
  const [days, setDays] = useState(7);
  const { data, error, refresh } = useLiveData(`/ai/admin/overview?daysAhead=${days}`, { intervalMs: 60000 });
  const loading = !data && !error;
  const forecast = buildForecast(data?.forecast?.daily);

  if (error && !data) {
    return (
      <ErrorCard onRetry={refresh} message="We couldn't load the platform forecast just now. Please try again." />
    );
  }

  return (
    <>
      <Summary forecast={forecast} donorCount={data?.donorCount} days={days} setDays={setDays} loading={loading} />

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<Scale size={18} />}
          title="Supply vs demand"
          hint="Expected surplus from all donors each day, against what verified NGOs say they can take in a day."
          estimate
        />
        {loading ? <CardSkeleton /> : <SupplyDemand capacity={data.capacity} />}
      </FadeIn>

      {/* Per-donor forecasts are possible because history points carry a donorId. */}
      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<Store size={18} />}
          title={`Top donors, next ${days} days`}
          hint="Where the most surplus is expected, so pickups can be lined up early."
          estimate
        />
        {loading ? <CardSkeleton height={140} /> : <TopDonors donors={data.donors} />}
      </FadeIn>

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<HandHeart size={18} />}
          title="Allocation fairness"
          hint="The smart allocation lowers the priority of organizations that received food recently, so food is shared fairly."
        />
        {loading ? <CardSkeleton height={160} /> : <Fairness rows={data.fairness} />}
      </FadeIn>

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<CalendarDays size={18} />}
          title="Surplus calendar"
          hint="Every donor combined, by food category and day. Darker means more within that row."
          estimate
        />
        {loading ? (
          <CardSkeleton height={200} />
        ) : forecast.rows.length ? (
          <div className="card ai-cal">
            <ForecastHeatmap forecast={forecast} />
          </div>
        ) : (
          <div className="card ff-state">
            <Store size={28} aria-hidden="true" />
            <p>No donor has enough history for a forecast yet, or the AI service is offline.</p>
          </div>
        )}
      </FadeIn>
    </>
  );
}

function Summary({ forecast, donorCount, days, setDays, loading }) {
  const peak = forecast.dayTotals.length ? forecast.dayTotals.reduce((a, b) => (b.kg > a.kg ? b : a)) : null;
  const top = forecast.rows[0];
  const stats = [
    {
      icon: <TrendingUp size={18} />,
      label: `Expected surplus, next ${days} days`,
      value: <><CountUp value={Math.round(forecast.total)} /> <small>kg</small></>,
      sub: "all donors combined",
    },
    { icon: <CalendarDays size={18} />, label: "Busiest day", value: peak ? dayName(peak.date) : "—", sub: peak && `about ${fmtKg(peak.kg)}` },
    { icon: <Store size={18} />, label: "Top category", value: top ? top.category : "—", sub: top && `about ${fmtKg(top.total)}` },
    { icon: <Users size={18} />, label: "Donors included", value: donorCount ?? 0, sub: "with enough history to forecast" },
  ];

  return (
    <div className="ff-banner aii-summary">
      <div className="aii-summary-head">
        <span className="ff-estimate">
          <Sparkles size={12} aria-hidden="true" /> AI estimate
        </span>
        <Toggle options={RANGES} value={days} onChange={setDays} label="How far ahead" />
      </div>
      {loading ? (
        <div className="ff-stats aii-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ff-stat" aria-hidden="true">
              <SkeletonLine width="60%" height={11} style={{ marginBottom: 8 }} />
              <SkeletonLine width="70%" height={20} />
            </div>
          ))}
        </div>
      ) : (
        <Stagger className="ff-stats aii-stats">
          {stats.map((s) => (
            <StaggerItem key={s.label} className="ff-stat">
              <span className="ff-stat-label">
                {s.icon}
                {s.label}
              </span>
              <strong className="ff-stat-value">{s.value}</strong>
              {s.sub && <span className="ff-stat-sub">{s.sub}</span>}
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

/** Rounds up to 4 x a 1/2/2.5/5 step, so the five y-axis ticks land on round kg values. */
function niceMax(v) {
  const raw = Math.max(v, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) * 4;
}

/**
 * Surplus bars against a capacity line. Both are kg, so they share one axis.
 * Days over capacity turn red and are also spelled out in words above the
 * chart, so the warning never rests on colour alone.
 */
function SupplyDemand({ capacity }) {
  const palette = useChartPalette();
  const reduced = useReducedMotion();
  const cap = capacity.dailyCapacityKg;
  const data = capacity.days.map((d) => ({ ...d, label: fmtLong(d.date) }));
  if (!data.length) {
    return (
      <div className="card ff-state">
        <Scale size={28} aria-hidden="true" />
        <p>There is no forecast to compare with NGO capacity yet.</p>
      </div>
    );
  }
  const atRisk = data.filter((d) => d.shortfallKg > 0);
  const top = niceMax(Math.max(cap, ...data.map((d) => d.surplusKg)) * 1.08);
  const tick = { fontSize: 11, fill: palette.inkMuted };

  return (
    <div className="card aii-sd">
      {atRisk.length ? (
        <ul className="aii-alerts">
          {atRisk.map((d) => (
            <li key={d.date} className="aii-alert aii-alert-red">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>{dayName(d.date)}:</strong> {fmtKg(d.surplusKg)} expected, NGOs can take {fmtKg(cap)} - about{" "}
                <strong>{fmtKg(d.shortfallKg)}</strong> at risk of being wasted.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="aii-alert aii-alert-green">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            <strong>All good.</strong> Verified NGOs can take {fmtKg(cap)} a day, which covers the expected surplus on
            every day shown.
          </span>
        </p>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
          <CartesianGrid stroke={palette.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: palette.grid }}
            tickFormatter={(v) => v.split(",")[0]}
            interval="preserveStartEnd"
          />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={64} unit=" kg" domain={[0, top]} tickCount={5} />
          <Tooltip cursor={{ fill: "rgba(56, 126, 1, 0.07)" }} content={<ChartTooltip unit="kg" />} />
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            formatter={(v) => <span style={{ color: palette.ink }}>{v}</span>}
          />
          <Bar
            dataKey="surplusKg"
            name="Expected surplus"
            fill={palette.brand}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            isAnimationActive={!reduced}
            animationDuration={600}
          >
            {data.map((d) => (
              <Cell key={d.date} fill={d.shortfallKg > 0 ? palette.critical : palette.brand} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="capacityKg"
            name="NGO capacity"
            stroke={palette.ink}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="aii-foot">
        Capacity is the daily intake of {capacity.organizations} verified NGO{capacity.organizations === 1 ? "" : "s"}, as
        each one entered it when registering.
      </p>
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

function TopDonors({ donors }) {
  if (!donors.length) {
    return (
      <div className="card ff-state">
        <Store size={28} aria-hidden="true" />
        <p>No donor has enough history for a forecast yet.</p>
      </div>
    );
  }
  return (
    <div className="card aii-table-card">
      <div className="aii-table-scroll">
        <table className="aii-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Donor</th>
              <th scope="col" className="num">Expected</th>
              <th scope="col">Peak day</th>
              <th scope="col">Top category</th>
            </tr>
          </thead>
          <tbody>
            {donors.slice(0, 10).map((d, i) => (
              <tr key={d.donorId}>
                <td className="aii-rank">{i + 1}</td>
                <td>
                  <strong>{d.name}</strong>
                  {d.location && <span className="aii-sub">{d.location}</span>}
                </td>
                <td className="num"><strong>{fmtKg(d.totalKg)}</strong></td>
                <td>
                  {d.peakDate ? dayName(d.peakDate) : "—"}
                  {d.peakKg != null && <span className="aii-sub">about {fmtKg(d.peakKg)}</span>}
                </td>
                <td>{d.topCategory || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fairness({ rows }) {
  if (!rows.length) {
    return (
      <div className="card ff-state">
        <HandHeart size={28} aria-hidden="true" />
        <p>There are no verified NGOs yet.</p>
      </div>
    );
  }
  const data = Object.fromEntries(rows.map((r) => [r.name, r.allocationsLast30Days]));
  return (
    <div className="card">
      <HorizontalBarChart data={data} height={Math.max(140, rows.length * 44)} unit="allocations" labelWidth={170} allowDecimals={false} />
      <p className="aii-foot">Allocations each organization received in the last 30 days.</p>
    </div>
  );
}

/* ====================== Model ====================== */

/** What each model input means, for an admin who did not build the model. */
const FEATURE_TEXT = {
  dow: "Day of the week",
  month: "Month of the year",
  r_lag1: "Yesterday's surplus vs the 7-day average",
  r_lag7: "Same day last week vs the 7-day average",
  cat_code: "Food category",
};

const MODEL_LABEL = { LinearRegression: "Linear Regression", RandomForest: "Random Forest" };
const label = (m) => MODEL_LABEL[m] || m;

function ModelTab() {
  const health = useLiveData("/ai/admin/health", { intervalMs: 30000 });
  const info = useLiveData("/ai/admin/model-info", { intervalMs: 300000 });
  const [confirming, setConfirming] = useState(false);
  const [training, setTraining] = useState(false);
  const toast = useToast();

  const retrain = async () => {
    setTraining(true);
    try {
      const next = await api.post("/ai/admin/retrain");
      toast.success(`Model retrained: ${label(next.model)}, average error ±${next.mae} kg.`);
      info.refresh();
      health.refresh();
    } catch (e) {
      toast.error(e.message || "Retraining failed.");
    } finally {
      setTraining(false);
      setConfirming(false);
    }
  };

  const online = health.data?.online;
  const m = info.data;
  const offline = m?.available === false;

  return (
    <>
      <FadeIn as="section" className="ff-section">
        <SectionHead icon={<Server size={18} />} title="AI service status" />
        {!health.data && !health.error ? (
          <CardSkeleton height={40} />
        ) : (
          <div className={`card aii-health ${online ? "on" : "off"}`}>
            <span className={`aii-status ${online ? "on" : "off"}`}>
              <span className="aii-dot" aria-hidden="true" />
              {online ? "Online" : "Offline"}
            </span>
            <p>
              {online
                ? `The Python forecasting service is answering (${health.data.responseMs} ms). Forecasts come from the trained model.`
                : "The Python forecasting service is not answering. The system automatically falls back to the simple Linear Regression trend model, and forecasts return to the trained model as soon as the service is back."}
            </p>
            <button type="button" className="btn btn-outline btn-sm ff-retry" onClick={health.refresh}>
              <RefreshCw size={14} aria-hidden="true" /> Check again
            </button>
          </div>
        )}
      </FadeIn>

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<BrainCircuit size={18} />}
          title="Surplus model"
          action={
            <button
              type="button"
              className="btn btn-primary aii-retrain"
              onClick={() => setConfirming(true)}
              disabled={training || !online}
              title={online ? undefined : "The AI service must be online to retrain"}
            >
              <RefreshCw size={15} className={training ? "fc-spin" : ""} aria-hidden="true" />
              {training ? "Retraining…" : "Retrain model"}
            </button>
          }
        />
        {!m && !info.error ? (
          <CardSkeleton height={240} />
        ) : (info.error && !m) || offline ? (
          <ErrorCard
            onRetry={info.refresh}
            message="Model details are unavailable because the AI service is offline."
          />
        ) : (
          <ModelCard m={m} />
        )}
      </FadeIn>

      {confirming && (
        <div className="rq-overlay" onClick={() => !training && setConfirming(false)}>
          <div
            className="rq-modal aii-confirm"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="aii-confirm-title"
            aria-describedby="aii-confirm-text"
          >
            <div className="rq-head">
              <div className="rq-head-icon"><RefreshCw size={20} /></div>
              <div className="rq-head-text">
                <h3 id="aii-confirm-title">Retrain the surplus model?</h3>
                <span>Usually takes a few seconds.</span>
              </div>
            </div>
            <div className="rq-body">
              <p id="aii-confirm-text" className="aii-confirm-text">
                The model is trained again on the full dataset and the best one is kept. Forecasts switch to the new
                model straight away; nothing else changes.
              </p>
            </div>
            <div className="rq-foot">
              <div className="rq-actions">
                <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)} disabled={training}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={retrain} disabled={training} autoFocus>
                  {training ? "Retraining…" : "Retrain now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModelCard({ m }) {
  const evaluation = m.evaluation || [];
  const baseline = evaluation.find((e) => e.model.startsWith("Baseline"));
  const best = evaluation.find((e) => e.model === m.model);
  const lower = baseline && best && baseline.mae > 0 ? Math.round((1 - best.mae / baseline.mae) * 100) : null;
  const trained = m.trainedAt
    ? new Date(m.trainedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return (
    <div className="card aii-model">
      <dl className="aii-facts">
        <div>
          <dt><BrainCircuit size={14} aria-hidden="true" /> Model</dt>
          <dd>{label(m.model)}</dd>
        </div>
        <div>
          <dt><Database size={14} aria-hidden="true" /> Training dataset</dt>
          <dd>{m.dataset || "Kaggle Store Item Demand Forecasting dataset"}</dd>
        </div>
        <div>
          <dt><Activity size={14} aria-hidden="true" /> Last trained</dt>
          <dd>{trained}</dd>
        </div>
        <div>
          <dt><CalendarDays size={14} aria-hidden="true" /> Train / test rows</dt>
          <dd>
            {m.trainRows ? `${m.trainRows.toLocaleString()} / ${m.testRows.toLocaleString()}` : "—"}
          </dd>
        </div>
      </dl>

      {m.features?.length > 0 && (
        <>
          <h3 className="aii-sub-title">Features used</h3>
          <ul className="aii-features">
            {m.features.map((f) => (
              <li key={f}>
                <code>{f}</code>
                <span>{FEATURE_TEXT[f] || f}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="aii-sub-title">Evaluation on held-out days</h3>
      {evaluation.length ? (
        <>
          <div className="aii-table-scroll">
            <table className="aii-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col" className="num">MAE (kg)</th>
                  <th scope="col" className="num">RMSE (kg)</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.map((e) => (
                  <tr key={e.model} className={e.model === m.model ? "aii-best" : undefined}>
                    <td>
                      {label(e.model)}
                      {e.model === m.model && <span className="aii-chip">In use</span>}
                    </td>
                    <td className="num">{e.mae.toFixed(2)}</td>
                    <td className="num">{e.rmse.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lower != null && (
            <p className="aii-verdict">
              {label(m.model)} error is <strong>{lower}% lower</strong> than the baseline (a plain 7-day average).
            </p>
          )}
        </>
      ) : (
        <p className="aii-foot">No evaluation is stored with this model yet. Retrain it to record one.</p>
      )}
    </div>
  );
}
