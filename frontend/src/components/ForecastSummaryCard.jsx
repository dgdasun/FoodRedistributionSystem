import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import { buildForecast, forecastSentence } from "./forecast/ForecastParts.jsx";
import { SkeletonLine } from "./Skeleton.jsx";
import "../styles/forecast.css";

/** Dashboard teaser for the Food Forecast page: one sentence from the same data, and a way in. */
export default function ForecastSummaryCard({ donorId }) {
  const { data, error } = useLiveData(`/ai/predict?daysAhead=7&donorId=${encodeURIComponent(donorId)}`, {
    intervalMs: 60000,
  });
  const sentence = forecastSentence(buildForecast(data?.daily), 7);

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
            {sentence ||
              (error && !data
                ? "Your forecast isn't available right now."
                : "Your forecast will appear once a few days of leftovers are recorded.")}
            <span>AI estimate · see what to list first and what is expiring soon</span>
          </p>
        )}
      </div>
      <Link to="/forecast" className="btn btn-primary">
        View full forecast <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
