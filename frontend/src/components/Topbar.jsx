import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Clock, HandHeart, Sprout, Ticket } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useFoodAlerts } from "../FoodAlertContext.jsx";
import { api } from "../api.js";
import { timeAgo } from "../timeAgo.js";
import { IconBell } from "./Icons.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { navItemsFor } from "../nav.js";
import { avatarUrl } from "../avatar.js";
import "../styles/notifications.css";

const EXTRA_TITLES = { "/help": "Help & Support", "/profile": "Profile" };
const MAX_SHOWN = 20;

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
  system: { Icon: Bell, title: "Notification" },
};

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
  // The ids that were unread at that moment stay highlighted as "new" while the
  // panel is open, otherwise the highlight would vanish before it's seen.
  const [freshIds, setFreshIds] = useState(() => new Set());
  const wrapRef = useRef(null);

  const toggleOpen = () => {
    if (!open) {
      setFreshIds(new Set(combined.filter((n) => !n.read).map((n) => n.id)));
      if (totalUnread > 0) markAllRead();
    }
    setOpen(!open);
  };

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
    const isNew = freshIds.has(n.id) || !n.read;
    return (
      <button key={n.id} type="button" className={`notif-item${isNew ? " is-new" : ""}`} onClick={() => markOneRead(n)}>
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
                  {freshIds.size > 0 && <span className="notif-count">{freshIds.size} new</span>}
                </span>
                <button
                  type="button"
                  className="notif-mark-all"
                  onClick={() => {
                    markAllRead();
                    setFreshIds(new Set());
                  }}
                  disabled={freshIds.size === 0 && totalUnread === 0}
                >
                  <CheckCheck size={15} />
                  Mark all read
                </button>
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
