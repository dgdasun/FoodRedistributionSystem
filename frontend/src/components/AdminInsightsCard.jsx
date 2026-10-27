import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import { dayName, fmtKg } from "./forecast/ForecastParts.jsx";
import { SkeletonLine } from "./Skeleton.jsx";
import "../styles/forecast.css";

/** Admin dashboard teaser for AI Insights: next week's total and whether NGOs can absorb it. */
export default function AdminInsightsCard() {
  const { data, error } = useLiveData("/ai/admin/overview?daysAhead=7", { intervalMs: 60000 });
  const total = data?.forecast?.totalPredictedKg ?? 0;
  const atRisk = (data?.capacity?.days || []).filter((d) => d.shortfallKg > 0);

  let sentence;
  if (error && !data) sentence = "The platform forecast isn't available right now.";
  else if (data && !total) sentence = "No donor has enough history for a forecast yet.";
  else if (data) {
    sentence =
      `About ${fmtKg(total)} of surplus expected from ${data.donorCount} donor${data.donorCount === 1 ? "" : "s"} in the next 7 days. ` +
      (atRisk.length
        ? `${atRisk.length} day${atRisk.length === 1 ? "" : "s"} exceed NGO capacity, starting ${dayName(atRisk[0].date)}.`
        : "Verified NGOs can take it all.");
  }

  return (
    <div className="card ff-teaser">
      <div className="ff-teaser-text">
        <Sparkles size={22} aria-hidden="true" />
        {!data && !error ? (
          <div style={{ flex: 1 }}>
            <SkeletonLine width="85%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonLine width="40%" height={11} />
          </div>
        ) : (
          <p>
            {sentence}
            <span>AI estimate · supply vs demand, top donors, fairness and model health</span>
          </p>
        )}
      </div>
      <Link to="/admin/ai-insights" className="btn btn-primary">
        View AI Insights <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
