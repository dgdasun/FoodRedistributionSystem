import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useFoodAlerts } from "../FoodAlertContext.jsx";
import { api } from "../api.js";
import { timeAgo } from "../timeAgo.js";
import { IconBell } from "./Icons.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { navItemsFor } from "../nav.js";
import { avatarUrl } from "../avatar.js";

const EXTRA_TITLES = { "/help": "Help & Support", "/profile": "Profile" };

// Accent dot color per notification type. Urgent gets the alarm red, warning
// gets amber, and the composting reroute ("info") gets a calm green — it's a
// status update, not something gone wrong.
function dotColor(type) {
  if (type === "urgent") return "var(--danger)";
  if (type === "warning") return "#D97706";
  if (type === "info") return "var(--primary)";
  return "var(--text-light)"; // backend system/request/ticket notifications — neutral
}

export default function Topbar() {
  const { user } = useAuth();
  const foodAlerts = useFoodAlerts();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;
    api
      .get(`/notifications/${user.id}`)
      .then((d) => {
        setUnread(d.unreadCount !== undefined ? d.unreadCount : 0);
        setNotifications(d.notifications || []);
      })
      .catch(() => {});
  }, [user]);

  // Merge the backend's account notifications (request/ticket/system messages)
  // with the client-side threshold alerts into one clean, time-sorted feed.
  const combined = [
    ...notifications.map((n) => ({
      id: n.id,
      source: "backend",
      title: null,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
    })),
    ...foodAlerts.notifications.map((n) => ({
      id: n.id,
      source: "alert",
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalUnread = unread + foodAlerts.unreadCount;

  const markAllRead = async () => {
    // Update immediately so the badge clears without waiting on the network.
    setUnread(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    foodAlerts.markAllRead();
    if (user?.id) {
      await api.patch(`/notifications/${user.id}/read-all`, {}).catch(() => {});
    }
  };

  const markOneRead = (item) => {
    if (item.read) return;
    if (item.source === "alert") {
      foodAlerts.markRead(item.id);
      return;
    }
    setUnread((u) => Math.max(0, u - 1));
    setNotifications((n) => n.map((x) => (x.id === item.id ? { ...x, read: true } : x)));
    api.patch(`/notifications/${item.id}/read`, {}).catch(() => {});
  };

  // Opening the dropdown counts as "viewing" the notifications, so clear the
  // unread badge then — not only when the user explicitly hits "Mark all read".
  const toggleOpen = () => {
    setOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && totalUnread > 0) {
        markAllRead();
      }
      return nextOpen;
    });
  };

  const roleLabel = {
    donor: "Donor",
    beneficiary: "Beneficiary",
    farm: "Farm / Compost",
    admin: "Administrator",
  }[user?.role] || "Donor";

  // The header names the current page, taken from the same nav definition the
  // sidebar renders, so the two can never disagree.
  const pageTitle =
    navItemsFor(user).find((i) => i.to === pathname)?.label || EXTRA_TITLES[pathname] || "Dashboard";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="topbar">
      <div className="topbar-title">
        <span className="topbar-date">{today}</span>
        <strong>{pageTitle}</strong>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <div className="bell-wrap" onClick={toggleOpen}>
          <div className="bell-circle">
            <IconBell size={20} color="var(--primary)" />
            {totalUnread > 0 && <span className="bell-badge">{totalUnread}</span>}
          </div>
          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 40,
                width: 320,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                zIndex: 50,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <strong style={{ fontSize: 13.5, color: "var(--text-dark)" }}>Notifications</strong>
                <span
                  style={{ fontSize: 12, color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
                  onClick={markAllRead}
                >
                  Mark all read
                </span>
              </div>
              {combined.length === 0 && (
                <div style={{ padding: 24, fontSize: 13, color: "var(--text-light)", textAlign: "center" }}>
                  No notifications yet — all caught up! 🌱
                </div>
              )}
              {combined.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  onClick={() => markOneRead(n)}
                  style={{
                    padding: "11px 16px",
                    fontSize: 12.5,
                    borderBottom: "1px solid var(--border)",
                    background: n.read ? "var(--surface)" : "var(--primary-lighter)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    cursor: n.read ? "default" : "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      marginTop: 4,
                      borderRadius: "50%",
                      background: dotColor(n.type),
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {n.title && (
                      <div style={{ fontWeight: 600, color: "var(--text-dark)", marginBottom: 2 }}>{n.title}</div>
                    )}
                    <div style={{ color: "var(--text-mid)" }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="user-chip" onClick={() => navigate("/profile")}>
          <div className="user-avatar-wrap">
            {avatarUrl(user) && (
              <img
                src={avatarUrl(user)}
                alt={user?.name || "User"}
                className="user-avatar-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            )}
            <div className="user-avatar-fallback" style={{ display: avatarUrl(user) ? "none" : "flex" }}>
              {user?.name?.[0] || "U"}
            </div>
          </div>
          <div className="user-meta">
            <strong>{user?.name || "R. Perera"}</strong>
            <span>{roleLabel}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: "var(--stone)", marginLeft: 4 }}>
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
