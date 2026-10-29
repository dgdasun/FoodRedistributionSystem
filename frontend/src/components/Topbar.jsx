import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Clock, HandHeart, ShieldCheck, Sprout, Ticket } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useFoodAlerts } from "../FoodAlertContext.jsx";
import { api } from "../api.js";
import { timeAgo } from "../timeAgo.js";
import { IconBell } from "./Icons.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { navItemsFor } from "../nav.js";
import { avatarUrl } from "../avatar.js";
import "../styles/notifications.css";

// Pages a role can open without having them in its own nav (admins reach
// Impact from the dashboard, for instance).
const EXTRA_TITLES = {
  "/help": "Help & Support",
  "/profile": "Profile",
  "/browse": "Available Food",
  "/impact": "Impact",
  "/forecast": "Food Forecast",
};
const MAX_SHOWN = 20;
const POLL_INTERVAL_MS = 30_000;

// Icon tile per notification type. Urgent gets the alarm red, warning amber,
// and the composting reroute ("info") a calm green — it's a status update, not
// something gone wrong. Backend notifications carry no title, so the type
// supplies one.
const TYPE_META = {
  urgent: { Icon: AlertTriangle, title: "Urgent" },
  warning: { Icon: Clock, title: "Expiring soon" },
  info: { Icon: Sprout, title: "Update" },
  request: { Icon: HandHeart, title: "Food request" },
  ticket: { Icon: Ticket, title: "Pickup ticket" },
  verification: { Icon: ShieldCheck, title: "Verification" },
  system: { Icon: Bell, title: "Notification" },
};

// Where clicking a notification takes you. Notifications carry no link, so the
// page comes from the type and the viewer's role (donors and beneficiaries keep
// their requests on different pages).
function targetFor(type, role) {
  const receiver = role === "beneficiary" || role === "farm";
  switch (type) {
    case "request": return receiver ? "/my-requests" : role === "donor" ? "/requests" : null;
    case "ticket": return receiver ? "/tickets" : role === "donor" ? "/pickups" : null;
    case "verification": return role === "admin" ? "/admin/beneficiaries" : "/profile";
    // Expiry alerts are raised on the donor's own listings.
    case "urgent":
    case "warning":
    case "info": return role === "donor" ? "/donations" : null;
    default: return null;
  }
}

const metaFor = (type) => (TYPE_META[type] ? { key: type, ...TYPE_META[type] } : { key: "system", ...TYPE_META.system });

// Alert messages repeat their title ("🌱 Rerouted to Composting: Rolls is…");
// drop that prefix since the title is already shown above the message.
function stripTitle(message, title) {
  if (!message || !title) return message;
  const rest = message.replace(/^[^\p{L}\p{N}]+/u, "");
  return rest.startsWith(title) ? rest.slice(title.length).replace(/^[\s:–—-]+/, "") : message;
}

const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();

export default function Topbar() {
  const { user } = useAuth();
  const foodAlerts = useFoodAlerts();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Poll so notifications created while the page is open (a new registration,
  // a request on your listing) reach the bell without a reload.
  useEffect(() => {
    if (!user) return;
    const load = () =>
      api
        .get(`/notifications/${user.id}`)
        .then((d) => {
          setUnread(d.unreadCount !== undefined ? d.unreadCount : 0);
          setNotifications(d.notifications || []);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
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

  const openNotification = (item) => {
    markOneRead(item);
    const to = targetFor(item.type, user?.role);
    if (!to) return;
    setOpen(false);
    navigate(to);
  };

  // Opening the panel only shows the notifications; they stay unread until the
  // user clicks one or hits "Mark all read" (which is why that button exists).
  const wrapRef = useRef(null);
  const toggleOpen = () => setOpen((o) => !o);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = combined.slice(0, MAX_SHOWN);
  const groups = [
    { label: "Today", items: shown.filter((n) => isToday(n.createdAt)) },
    { label: "Earlier", items: shown.filter((n) => !isToday(n.createdAt)) },
  ].filter((g) => g.items.length > 0);

  const renderItem = (n) => {
    const meta = metaFor(n.type);
    const title = n.title || meta.title;
    const isNew = !n.read;
    return (
      <button key={n.id} type="button" className={`notif-item${isNew ? " is-new" : ""}`} onClick={() => openNotification(n)}>
        <span className={`notif-icon t-${meta.key}`}>
          <meta.Icon size={17} strokeWidth={2.2} />
        </span>
        <span className="notif-body">
          <span className="notif-row">
            <span className="notif-title">{title}</span>
            <span className="notif-time">{timeAgo(n.createdAt)}</span>
          </span>
          <span className="notif-msg">{stripTitle(n.message, title)}</span>
        </span>
        {isNew && <span className="notif-dot" aria-label="New" />}
      </button>
    );
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
        <div className="bell-wrap" ref={wrapRef}>
          <div className="bell-circle" onClick={toggleOpen} role="button" aria-label="Notifications" aria-expanded={open}>
            <IconBell size={20} color="var(--primary)" />
            {totalUnread > 0 && <span className="bell-badge">{totalUnread}</span>}
          </div>
          {open && (
            <div className="notif-panel" role="dialog" aria-label="Notifications">
              <div className="notif-head">
                <span className="notif-head-title">
                  Notifications
                  {totalUnread > 0 && <span className="notif-count">{totalUnread} new</span>}
                </span>
                {totalUnread > 0 ? (
                  <button type="button" className="notif-mark-all" onClick={markAllRead}>
                    <CheckCheck size={15} />
                    Mark all read
                  </button>
                ) : (
                  combined.length > 0 && (
                    <span className="notif-all-read">
                      <CheckCheck size={15} />
                      All caught up
                    </span>
                  )
                )}
              </div>

              {combined.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty-icon">
                    <Bell size={22} />
                  </span>
                  <strong>You're all caught up</strong>
                  <span>New alerts about your food and requests will show up here.</span>
                </div>
              ) : (
                <div className="notif-list">
                  {groups.map((g) => (
                    <div key={g.label}>
                      <div className="notif-group">{g.label}</div>
                      {g.items.map(renderItem)}
                    </div>
                  ))}
                </div>
              )}

              {combined.length > MAX_SHOWN && (
                <div className="notif-foot">
                  Showing the latest {MAX_SHOWN} of {combined.length}
                </div>
              )}
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
