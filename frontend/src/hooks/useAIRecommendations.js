import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { topReasons } from "../components/AIRecommendations.jsx";

/**
 * AI rankings for every item that has pending requests, keyed by item id.
 *
 * Refetches whenever the set of pending requests changes (an approval or
 * rejection), but keeps the previous rankings on screen until the new ones
 * arrive so the cards don't flash back to a loading state.
 */
export function useAIRecommendations(requests) {
  const [rankings, setRankings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pending = requests.filter((r) => r.status === "pending");
  // Stable key: only refetch when the pending set itself changes.
  const pendingKey = pending.map((r) => r.id).sort().join(",");
  const itemIds = useMemo(() => [...new Set(pending.map((r) => r.itemId))], [pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (itemIds.length === 0) {
      setRankings({});
      return undefined;
    }
    let stale = false;
    setLoading(true);
    setError("");
    Promise.allSettled(itemIds.map((id) => api.get(`/requests/recommendations/${id}`)))
      .then((results) => {
        if (stale) return;
        const next = {};
        results.forEach((res, i) => {
          if (res.status === "fulfilled") next[itemIds[i]] = res.value.ranking || [];
        });
        if (results.every((r) => r.status === "rejected")) {
          setError(results[0].reason?.message || "Could not load AI recommendations right now.");
        }
        setRankings(next);
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [itemIds]);

  /** Score, rank and reasons for one request, for the detail modal. */
  const insightFor = (request) => {
    const ranking = request && rankings[request.itemId];
    const idx = ranking ? ranking.findIndex((e) => e.requestId === request.id) : -1;
    if (idx < 0) return null;
    const entry = ranking[idx];
    return { ...entry, rank: idx + 1, total: ranking.length, reasons: topReasons(entry, 3) };
  };

  return { rankings, loading, error, insightFor };
}
