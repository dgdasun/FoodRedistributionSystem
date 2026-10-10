// Notification state, polling, and deduplication for the Alert & Threshold
// Notification Engine. This is the "hook" half of the engine — alertEngine.js
// decides WHAT applies to a listing, this file decides WHEN to check and how
// to keep a clean, deduplicated notification feed around it.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { api } from "./api.js";
import { evaluateItem, buildAlert } from "./alertEngine.js";

const FoodAlertContext = createContext(null);

const POLL_INTERVAL_MS = 60_000;
const MAX_STORED_ALERTS = 50;

function storageKey(userId) {
  return `zerowaste_alerts_${userId}`;
}

function loadStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function FoodAlertProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // The poll loop reads this ref (not `notifications` in a closure) so it always
  // dedupes against the latest list without needing to be re-created on every change.
  const notificationsRef = useRef([]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Load this user's alert history the moment they're known; clear on logout.
  useEffect(() => {
    setNotifications(user ? loadStored(user.id) : []);
  }, [user?.id]);

  // Persist on every change so alerts survive a refresh.
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(storageKey(user.id), JSON.stringify(notifications));
  }, [notifications, user?.id]);

  const scan = useCallback(async () => {
    // Threshold alerts describe a donor's own listing lifecycle (unclaimed,
    // going urgent, aging out to compost) — the donor is the one who needs to
    // act on them, so that's the only role this engine watches on their behalf.
    if (!user || user.role !== "donor") return;

    try {
      const [donationsRes, requestsRes, settingsRes] = await Promise.all([
        api.get(`/donations?donorId=${user.id}`),
        api.get(`/requests?donorId=${user.id}`),
        api.get("/settings"),
      ]);

      const requestCounts = {};
      for (const r of requestsRes.requests) {
        requestCounts[r.itemId] = (requestCounts[r.itemId] || 0) + 1;
      }

      const now = new Date();
      const settings = settingsRes.settings;
      const existing = notificationsRef.current;
      const fresh = [];

      for (const item of donationsRes.donations) {
        if (item.status === "collected") continue;

        const { states, hoursRemaining } = evaluateItem(item, requestCounts[item.id] || 0, settings, now);

        for (const state of states) {
          const alert = buildAlert(item, state, hoursRemaining);
          if (!alert) continue;

          // One notification per state transition per listing: each state maps to
          // its own `type`, so "already have a notification of this type for this
          // item" is exactly "already alerted for this transition".
          const alreadyNotified = existing.some((n) => n.itemId === item.id && n.type === alert.type);
          if (alreadyNotified) continue;

          fresh.push({
            id: `${item.id}-${alert.type}-${now.getTime()}`,
            itemId: item.id,
            title: alert.title,
            message: alert.message,
            type: alert.type, // 'info' | 'warning' | 'urgent'
            createdAt: now.toISOString(),
            read: false,
          });
        }
      }

      if (fresh.length > 0) {
        setNotifications((prev) => [...fresh, ...prev].slice(0, MAX_STORED_ALERTS));
      }
    } catch {
      // Silent by design — a missed scan just gets picked up on the next tick.
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "donor") return;
    scan();
    const id = setInterval(scan, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, scan]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <FoodAlertContext.Provider value={{ notifications, unreadCount, markAllRead, markRead }}>
      {children}
    </FoodAlertContext.Provider>
  );
}

export function useFoodAlerts() {
  const ctx = useContext(FoodAlertContext);
  if (!ctx) throw new Error("useFoodAlerts must be used within a FoodAlertProvider");
  return ctx;
}
