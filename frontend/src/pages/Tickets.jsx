import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Package, MapPin, Calendar, Clock, Download, Ticket as TicketIcon, Check, TimerOff, QrCode } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

const STATUS = {
  pending: { label: "Ready for pickup", tone: "warn" },
  collected: { label: "Collected", tone: "ok" },
  expired: { label: "Expired", tone: "danger" },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: "muted" };
  return (
    <span className={`bx-badge ${s.tone}`}>
      {status === "collected" ? <Check size={12} strokeWidth={3} /> : <span className="bx-dot" />}
      {s.label}
    </span>
  );
}

const HOUR_MS = 60 * 60 * 1000;

function formatClockTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Human-readable "time left" (e.g. "45m", "2h 15m"). */
function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** A ticket is expired when the backend says so or its collection window has lapsed. */
function isTicketExpired(ticket, now) {
  if (ticket.status === "collected") return false;
  if (ticket.status === "expired") return true;
  return !!ticket.expiresAt && new Date(ticket.expiresAt).getTime() <= now;
}

/**
 * Derives the Admin-configured QR collection window state for a ticket: the
 * deadline, whether it has lapsed, how much of it is left, and display copy.
 */
function useCollectionWindow(ticket, now) {
  const expiresAt = ticket.expiresAt ? new Date(ticket.expiresAt) : null;
  const isSettled = ticket.status === "collected";
  const isExpired = isTicketExpired(ticket, now);

  if (!expiresAt) return { isExpired, isSettled, leftText: null, validUntilText: null, percent: null, tone: "" };

  const msLeft = expiresAt.getTime() - now;
  const windowMs = (ticket.collectionWindowHours || 0) * HOUR_MS;
  const percent = windowMs > 0 ? Math.max(0, Math.min(100, (msLeft / windowMs) * 100)) : null;

  let leftText;
  if (isSettled) leftText = "Picked up";
  else if (isExpired) leftText = "Window closed";
  else leftText = `${formatDuration(msLeft)} left`;

  return {
    isExpired,
    isSettled,
    leftText,
    validUntilText: `${isExpired ? "Closed" : "Valid until"} ${formatClockTime(expiresAt)}`,
    percent: isSettled ? 100 : isExpired ? 0 : percent,
    tone: isExpired ? "danger" : msLeft <= HOUR_MS ? "warn" : "",
  };
}

/**
 * Boarding-pass style ticket. Used by the beneficiary/farm "My Collection
 * Tickets" page and the donor "Pickup Tickets" page (no QR for donors).
 */
export function CollectionTicketCard({ ticket, isDonor = false, onAction }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isDonor || !ticket.qrCode) return;
    let cancelled = false;
    QRCode.toDataURL(ticket.qrCode, { margin: 1, width: 264 })
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ticket.qrCode, isDonor]);

  // Keep the collection-window countdown live without a page refresh.
  useEffect(() => {
    if (ticket.status !== "pending" || !ticket.expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, [ticket.status, ticket.expiresAt]);

  const win = useCollectionWindow(ticket, now);
  const displayStatus = win.isExpired ? "expired" : ticket.status;
  const dim = displayStatus !== "pending";

  const handleDownload = () => {
    onAction?.("download", ticket);
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ticket-${ticket.id}.png`;
    link.click();
  };

  return (
    <article className={dim ? "bx-ticket is-dim" : "bx-ticket"}>
      <div className="bx-ticket-stub">
        {isDonor ? (
          <div className="bx-empty-icon" style={{ margin: 0 }}>
            <TicketIcon size={26} />
          </div>
        ) : (
          <div className="bx-qr">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`Pickup QR code for ticket ${ticket.id}`} />
            ) : (
              <div className="bx-qr-placeholder">Loading…</div>
            )}
            {displayStatus === "collected" && (
              <div className="bx-qr-overlay ok">
                <span>
                  <Check size={14} strokeWidth={3} /> Collected
                </span>
              </div>
            )}
            {displayStatus === "expired" && (
              <div className="bx-qr-overlay expired">
                <span>
                  <TimerOff size={14} /> Expired
                </span>
              </div>
            )}
          </div>
        )}
        <span className="bx-ticket-id">#{ticket.id}</span>
      </div>

      <div className="bx-ticket-main">
        <div className="bx-ticket-top">
          <div style={{ minWidth: 0 }}>
            <h3>{ticket.item?.name || "Food Item"}</h3>
            <span className="bx-req-sub">
              {isDonor ? "Collection ticket" : displayStatus === "pending" ? "Show the QR code to the donor at pickup" : "Collection ticket"}
            </span>
          </div>
          <div className="bx-ticket-badges">
            <StatusBadge status={displayStatus} />
          </div>
        </div>

        <div className="bx-ticket-grid">
          <div className="bx-ticket-field">
            <small>
              <Package size={12} /> Quantity
            </small>
            <div>{ticket.quantityKg} kg</div>
          </div>
          <div className="bx-ticket-field">
            <small>
              <Calendar size={12} /> Date
            </small>
            <div>{ticket.pickupDate || "TBC"}</div>
          </div>
          <div className="bx-ticket-field">
            <small>
              <Clock size={12} /> Window
            </small>
            <div>{ticket.collectionWindowHours ? `${ticket.collectionWindowHours} hours` : ticket.pickupTime || "—"}</div>
          </div>
          <div className="bx-ticket-field">
            <small>
              <MapPin size={12} /> Pickup at
            </small>
            <div title={ticket.pickupLocation}>{ticket.pickupLocation || "—"}</div>
          </div>
        </div>

        <div className="bx-ticket-foot">
          {win.leftText ? (
            <div className="bx-window">
              <div className="bx-window-text">
                <strong>{win.leftText}</strong>
                <span>{win.validUntilText}</span>
              </div>
              {win.percent !== null && (
                <div
                  className="bx-window-bar"
                  role="progressbar"
                  aria-label="Collection window remaining"
                  aria-valuenow={Math.round(win.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i className={win.isSettled ? "" : win.tone} style={{ width: `${win.percent}%` }} />
                </div>
              )}
            </div>
          ) : (
            <span />
          )}
          {!isDonor && (
            <button type="button" onClick={handleDownload} disabled={!qrDataUrl} className="bx-btn outline">
              <Download size={15} />
              Download QR
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const TABS = [
  { key: "active", label: "Ready for pickup" },
  { key: "collected", label: "Collected" },
  { key: "expired", label: "Expired" },
  { key: "all", label: "All" },
];

function statusOf(ticket, now) {
  return isTicketExpired(ticket, now) ? "expired" : ticket.status === "collected" ? "collected" : "active";
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState(null);
  const [tab, setTab] = useState("active");
  const isDonor = user.role === "donor";

  useEffect(() => {
    const query = isDonor ? `donorId=${user.id}` : `beneficiaryId=${user.id}`;
    api.get(`/tickets?${query}`).then((d) => setTickets(d.tickets || []));
  }, [user.id, isDonor]);

  const now = Date.now();
  const counts = useMemo(() => {
    const c = { active: 0, collected: 0, expired: 0, all: (tickets || []).length };
    (tickets || []).forEach((t) => c[statusOf(t, now)]++);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  // Land on whichever tab has something in it, so the page never opens empty
  // when there are tickets to show.
  useEffect(() => {
    if (tickets && counts.active === 0 && counts.all > 0) setTab("all");
  }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const list = (tickets || []).filter((t) => tab === "all" || statusOf(t, now) === tab);
    // Live tickets first, soonest deadline on top.
    const rank = { active: 0, collected: 1, expired: 2 };
    return list.sort(
      (a, b) =>
        rank[statusOf(a, now)] - rank[statusOf(b, now)] ||
        new Date(a.expiresAt || 0).getTime() - new Date(b.expiresAt || 0).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, tab]);

  const collectedKg =
    Math.round(
      (tickets || []).filter((t) => t.status === "collected").reduce((s, t) => s + Number(t.quantityKg || 0), 0) * 10
    ) / 10;

  return (
    <>
      <section className="bx-hero">
        <div className="bx-hero-text">
          <span className="bx-eyebrow">
            <QrCode size={13} /> {isDonor ? "Pickups" : "Collection passes"}
          </span>
          <h1>{isDonor ? "Pickup Tickets" : "My Collection Tickets"}</h1>
          <p>
            {isDonor
              ? "Scan a beneficiary's QR code (in the sidebar) at pickup to confirm and complete the donation."
              : "Show the QR code to the donor at pickup. Each pass is only valid during its collection window."}
          </p>
        </div>
        <div className="bx-stats">
          <div className="bx-stat">
            <span className="bx-stat-value">{tickets ? counts.active : "–"}</span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--warning)" }} /> Ready
            </span>
          </div>
          <div className="bx-stat">
            <span className="bx-stat-value">{tickets ? counts.collected : "–"}</span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--status-ok-fg)" }} /> Collected
            </span>
          </div>
          <div className="bx-stat">
            <span className="bx-stat-value">
              {tickets ? collectedKg : "–"}
              <small>kg</small>
            </span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--primary)" }} /> Picked up
            </span>
          </div>
        </div>
      </section>

      {tickets && tickets.length > 0 && (
        <div className="bx-tabs" role="tablist" aria-label="Filter tickets">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? "bx-tab active" : "bx-tab"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="bx-tab-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {!tickets ? (
        <div className="bx-tickets">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton" style={{ height: 210, borderRadius: 24 }} aria-hidden="true" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="bx-tickets">
          {visible.map((t) => (
            <CollectionTicketCard key={t.id} ticket={t} isDonor={isDonor} />
          ))}
        </div>
      ) : (
        <div className="bx-empty">
          <div className="bx-empty-icon">
            <TicketIcon size={26} />
          </div>
          <h3>{tickets.length === 0 ? "No tickets yet" : "No tickets here"}</h3>
          <p>
            {tickets.length === 0
              ? isDonor
                ? "Confirmed pickup tickets from beneficiaries will show up here."
                : "Once a donor approves your request, your pickup pass will appear here."
              : "There are no tickets with this status."}
          </p>
          {tickets.length === 0 && !isDonor && (
            <Link to="/browse" className="bx-btn primary">
              Browse available food
            </Link>
          )}
        </div>
      )}
    </>
  );
}
