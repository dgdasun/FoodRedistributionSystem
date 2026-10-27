import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import LottieState from "./LottieState.jsx";
import {
  buildForecast,
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
 * Day-by-day surplus forecast from the trained model, for one donor.
 *
 * Built from that donor's own inventory history only (/ai/predict?donorId=),
 * so a shop sees its own pattern rather than the platform's. Admins get the
 * combined view in AdminSurplusPlanner.
 */
export default function AISurplusCalendar({ donorId }) {
  const [days, setDays] = useState(7);
  const [view, setView] = useState("calendar");
  const { data, error } = useLiveData(`/ai/predict?daysAhead=${days}&donorId=${encodeURIComponent(donorId)}`, {
    intervalMs: 60000,
  });
  const { data: model } = useLiveData("/ai/model", { intervalMs: 300000 });
  const { data: settingsData } = useLiveData("/settings", { intervalMs: 300000 });

  const forecast = buildForecast(data?.daily);

  return (
    <div className="card ai-cal">
      <div className="card-title ai-cal-head">
        <h3 className="section-title-with-leaf" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} color="var(--primary)" />
          AI Surplus Calendar
        </h3>
        <div className="fc-controls">
          <Toggle options={VIEWS} value={view} onChange={setView} label="View" />
          <Toggle options={RANGES} value={days} onChange={setDays} label="Forecast horizon" />
        </div>
      </div>
      <p className="ai-cal-sub">
        Which food categories the trained model expects to become surplus at your store, and on which days.
      </p>

      {!data && !error && (
        <LottieState title="Running the model" message="Forecasting surplus for the coming days…" size={110} />
      )}
      {error && !data && (
        <LottieState title="Forecast unavailable" message="The AI service did not respond. It will retry shortly." size={110} />
      )}
      {data && !forecast.rows.length && (
        <LottieState
          title="No forecast yet"
          message={
            data.predictions && !Object.keys(data.predictions).length
              ? "There is no inventory history for your store yet, so the model has nothing to learn from."
              : "The trained model is offline, so only category totals are available right now."
          }
          size={110}
        />
      )}

      {forecast.rows.length > 0 && (
        <>
          <ForecastKpis forecast={forecast} previousPeriodKg={data.previousPeriodKg} days={days} model={model} />
          {view === "calendar" ? <ForecastHeatmap forecast={forecast} /> : <ForecastStackedChart forecast={forecast} />}
          <ListingPlan forecast={forecast} settings={settingsData?.settings} />
          {data.note && <p className="ai-cal-note">{data.note}</p>}
        </>
      )}
    </div>
  );
}
