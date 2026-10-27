import React, { useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { useLiveData } from "../hooks/useLiveData.js";
import { useToast } from "./Toast.jsx";

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The surplus model behind every forecast: which algorithm won, its error on
 * held-out days, and when it was trained. Retrain re-runs app/ml/train.py on
 * the AI service and swaps the new model in without a restart.
 */
export default function AIModelCard() {
  const { data, error, refresh } = useLiveData("/ai/model", { intervalMs: 300000 });
  const [training, setTraining] = useState(false);
  const toast = useToast();

  const retrain = async () => {
    setTraining(true);
    try {
      const info = await api.post("/ai/model/retrain");
      toast.success(`Retrained: ${info.model}, error ±${info.mae} kg on held-out days.`);
      refresh();
    } catch (e) {
      toast.error(e.message || "Retraining failed");
    } finally {
      setTraining(false);
    }
  };

  const offline = (error && !data) || data?.available === false;
  const rows = data && !offline
    ? [
        ["Mean abs. error", data.mae != null ? `±${data.mae} kg` : "Not scored"],
        ["RMSE", data.rmse != null ? `${data.rmse} kg` : "—"],
        ["7-day average baseline", data.baselineMae != null ? `±${data.baselineMae} kg` : "—"],
        ["Train / test rows", data.trainRows ? `${data.trainRows.toLocaleString()} / ${data.testRows.toLocaleString()}` : "—"],
        ["Last trained", data.trainedAt ? fmtWhen(data.trainedAt) : "—"],
      ]
    : [];

  return (
    <div className="card fc-model">
      <div className="ad-card-head">
        <h3>
          <span className="ad-card-icon"><Brain size={17} color="currentColor" /></span> Surplus model
        </h3>
        {data?.model && <span className="ad-chip">{data.model}</span>}
      </div>

      {!data && !error && <p className="fc-empty">Loading model details…</p>}
      {offline && <p className="fc-empty">The AI service is offline, so model details are unavailable.</p>}

      {rows.length > 0 && (
        <>
          <dl className="fc-model-stats">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {data.compared && (
            <p className="fc-model-note">
              Compared on the same held-out days:{" "}
              {Object.entries(data.compared)
                .map(([name, mae]) => `${name} ±${mae} kg`)
                .join(", ")}
              . The lowest error is kept.
            </p>
          )}
        </>
      )}

      <button type="button" className="fc-retrain" onClick={retrain} disabled={training || offline}>
        <RefreshCw size={15} className={training ? "fc-spin" : ""} aria-hidden="true" />
        {training ? "Retraining…" : "Retrain model"}
      </button>
    </div>
  );
}
