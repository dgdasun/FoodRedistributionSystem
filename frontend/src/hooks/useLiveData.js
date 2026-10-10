import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

/**
 * Keeps a GET endpoint fresh.
 *
 * The backend exposes plain REST with no websocket or SSE channel, so this
 * polls. Two things stop that from being wasteful:
 *
 *   - polling is suspended while the tab is hidden, and
 *   - becoming visible again triggers an immediate refetch,
 *
 * so a backgrounded dashboard costs nothing and is never stale when you
 * return to it.
 *
 * The first load is the only one that clears `data`; refreshes swap the value
 * underneath the rendered UI, so charts re-animate to new numbers instead of
 * collapsing into a loading state on every tick.
 */
export function useLiveData(path, { intervalMs = 15000, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Kept in a ref so the polling effect doesn't re-subscribe on every fetch.
  const pathRef = useRef(path);
  pathRef.current = path;
  const mounted = useRef(true);

  const fetchNow = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await api.get(pathRef.current);
      if (!mounted.current) return;
      setData(next);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      if (!mounted.current) return;
      // Keep the last good data on screen; a dropped poll shouldn't blank the page.
      setError(err);
    } finally {
      if (mounted.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Refetch whenever the endpoint itself changes (e.g. a filter moved).
  useEffect(() => {
    if (!enabled) return;
    fetchNow();
  }, [path, enabled, fetchNow]);

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined;

    let timer = null;
    const start = () => {
      stop();
      timer = setInterval(() => {
        if (!document.hidden) fetchNow();
      }, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchNow();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, fetchNow]);

  return { data, error, lastUpdated, isRefreshing, refresh: fetchNow };
}

export default useLiveData;
