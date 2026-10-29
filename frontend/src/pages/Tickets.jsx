import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import {
  Package, MapPin, CalendarDays, Clock, Download, Ticket as TicketIcon, Maximize2, X, Copy, Check, Timer,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { IconTicket, IconShieldCheck, IconWeight, IconClock } from "../components/Icons.jsx";
import { imageFor } from "../foodImages.js";
import "../styles/food-requests.css";
import "../styles/tickets.css";

const STATUS = {
  pending: { label: "Ready to collect", tone: "ok" },
  collected: { label: "Collected", tone: "done" },
  expired: { label: "Expired", tone: "danger" },
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "collected", label: "Collected" },
  { key: "expired", label: "Expired" },
  { key: "all", label: "All" },
];

const HOUR_MS = 60 * 60 * 1000;

function formatClockTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Human-readable "time left" (e.g. "45m", "2h 15m") until `target`, relative to `now`. */
function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Derives the Admin-configured QR collection window state for a ticket: the
 * deadline, whether it has lapsed, how much of the window is left, and copy.
 */
function collectionWindow(ticket, now) {
  const expiresAt = ticket.expiresAt ? new Date(ticket.expiresAt) : null;
  const isSettled = ticket.status === "collected";
  if (!expiresAt) return { expiresAt: null, isExpired: ticket.status === "expired", isSettled, percent: null, leftText: null };

  const msLeft = expiresAt.getTime() - now;
  const isExpired = ticket.status === "expired" || (!isSettled && msLeft <= 0);
  const windowMs = (ticket.collectionWindowHours || 0) * HOUR_MS;
  const percent = !isSettled && !isExpired && windowMs > 0 ? Math.max(3, Math.min(100, (msLeft / windowMs) * 100)) : null;
  const leftText = isSettled ? null : isExpired ? "Window closed" : `${formatDuration(msLeft)} left`;
  return { expiresAt, isExpired, isSettled, percent, leftText, urgent: !isExpired && msLeft <= HOUR_MS };
}

const displayStatusOf = (ticket, now) => (collectionWindow(ticket, now).isExpired ? "expired" : ticket.status);

function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function useQr(value, width = 220) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!value) return undefined;
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width })
      .then((u) => !cancelled && setUrl(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, width]);
  return url;
}

/** Full-screen, high-contrast QR for the donor to scan at the counter. */
function QrModal({ ticket, onClose }) {
  const url = useQr(ticket.qrCode, 520);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tk-qr-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pickup QR code">
      <div className="tk-qr-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tk-qr-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span className="tk-qr-eyebrow">Show this to the donor</span>
        <h3>{ticket.item?.name || "Food item"}</h3>
        <p>{ticket.quantityKg} kg · {ticket.pickupLocation}</p>
        <div className="tk-qr-big">
          {url ? <img src={url} alt="Pickup QR code" /> : <div className="tk-qr-loading" />}
        </div>
        <code className="tk-qr-id">{ticket.id}</code>
        <span className="tk-qr-hint">Turn your screen brightness up if the scan doesn't pick it up.</span>
      </div>
    </div>
  );
}

/**
 * Reusable ticket-pass card used across the beneficiary "My Collection Tickets"
 * page and the donor "Pickup Tickets" page.
 */
export function CollectionTicketCard({ ticket, isDonor = false, forFeed = false, onAction, onShowQr }) {
  const qrDataUrl = useQr(isDonor ? null : ticket.qrCode);
  const now = useNow(ticket.status === "pending" && !!ticket.expiresAt);
  const [copied, setCopied] = useState(false);

  const win = collectionWindow(ticket, now);
  const status = win.isExpired ? "expired" : ticket.status;
  const st = STATUS[status] || { label: status, tone: "muted" };
  const live = status === "pending";

  const handleDownload = () => {
    onAction?.("download", ticket);
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ticket-${ticket.id}.png`;
    link.click();
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(ticket.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked - the ID is still visible to read out */
    }
  };

  return (
    <article className={`tk-card tk-${st.tone}`}>
      {!isDonor && (
        <div className="tk-stub">
          <button
            type="button"
            className="tk-qr"
            onClick={() => live && onShowQr?.(ticket)}
            disabled={!live}
            aria-label={live ? "Show QR code full screen" : `QR code (${st.label})`}
          >
            {qrDataUrl ? <img src={qrDataUrl} alt="" /> : <span className="tk-qr-loading" />}
            {!live && <span className="tk-stamp">{st.label}</span>}
            {live && <span className="tk-qr-zoom"><Maximize2 size={13} /></span>}
          </button>
          <span className="tk-stub-label">{live ? "Scan at donor hub" : "No longer valid"}</span>
        </div>
      )}

      <div className="tk-body">
        <div className="tk-head">
          <img className="tk-thumb" src={imageFor(ticket.item?.category)} alt="" loading="lazy" />
          <div className="tk-head-text">
            <h3>{ticket.item?.name || "Food item"}</h3>
            <div className="tk-head-meta">
              <span className={`tk-badge tk-badge-${st.tone}`}>
                {status === "collected" && <Check size={12} strokeWidth={3} />}
                {st.label}
              </span>
              <button type="button" className="tk-id" onClick={copyId} title="Copy ticket ID">
                #{ticket.id} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <dl className="tk-details">
          <div><dt><Package size={14} /> Quantity</dt><dd>{ticket.quantityKg} kg {forFeed ? "for feed / compost" : "surplus"}</dd></div>
          <div><dt><MapPin size={14} /> Pickup at</dt><dd title={ticket.pickupLocation}>{ticket.pickupLocation}</dd></div>
          <div><dt><CalendarDays size={14} /> Collect by</dt><dd>{formatDate(ticket.pickupDate)}{ticket.pickupTime ? ` · ${ticket.pickupTime}` : ""}</dd></div>
          <div>
            <dt><Clock size={14} /> Window</dt>
            <dd>
              {ticket.collectionWindowHours ? `${ticket.collectionWindowHours}h` : "—"}
              {win.expiresAt && !win.isSettled && <span className="tk-muted"> · until {formatClockTime(win.expiresAt)}</span>}
            </dd>
          </div>
        </dl>

        {win.percent != null && (
          <div className={win.urgent ? "tk-window urgent" : "tk-window"}>
            <div className="tk-window-head">
              <span><Timer size={13} /> Collection window</span>
              <strong>{win.leftText}</strong>
            </div>
            <div className="tk-window-bar"><span style={{ width: `${win.percent}%` }} /></div>
          </div>
        )}
      </div>

      {!isDonor && (
        <div className="tk-actions">
          {live && (
            <button type="button" className="tk-btn tk-btn-primary" onClick={() => onShowQr?.(ticket)}>
              <Maximize2 size={15} /> Show QR
            </button>
          )}
          <button type="button" className="tk-btn tk-btn-ghost" onClick={handleDownload} disabled={!qrDataUrl}>
            <Download size={15} /> Download
          </button>
        </div>
      )}
    </article>
  );
}

function EmptyTicketsState({ isDonor, filtered }) {
  return (
    <div className="tk-empty">
      <div className="tk-empty-icon"><TicketIcon size={26} /></div>
      <strong>{filtered ? "No tickets here" : "No tickets yet"}</strong>
      <p>
        {filtered
          ? "No tickets with this status."
          : isDonor
            ? "Confirmed pickup tickets from beneficiaries will show up here."
            : "Once a donor approves your request, its pickup ticket and QR code appear here."}
      </p>
      {!filtered && !isDonor && (
        <Link to="/my-requests" className="btn btn-outline btn-sm">View my requests</Link>
      )}
    </div>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState(null);
  // null = not chosen yet: open on Active when something is collectable, else All.
  const [chosenTab, setTab] = useState(null);
  const [qrTicket, setQrTicket] = useState(null);
  const isDonor = user.role === "donor";
  const now = useNow(true);

  const load = () => {
    const query = isDonor ? `donorId=${user.id}` : `beneficiaryId=${user.id}`;
    api.get(`/tickets?${query}`).then((d) => setTickets(d.tickets || [])).catch(() => setTickets((p) => p || []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const all = tickets || [];
  const loading = tickets === null;

  const withStatus = useMemo(() => all.map((t) => ({ t, s: displayStatusOf(t, now) })), [all, now]);
  const counts = useMemo(() => {
    const c = { all: all.length, active: 0, collected: 0, expired: 0 };
    withStatus.forEach(({ s }) => {
      if (s === "pending") c.active += 1;
      else if (s in c) c[s] += 1;
    });
    return c;
  }, [withStatus, all.length]);

  const collectedKg = Math.round(
    withStatus.filter(({ s }) => s === "collected").reduce((sum, { t }) => sum + Number(t.quantityKg || 0), 0) * 10
  ) / 10;

  const next = useMemo(
    () => withStatus.filter(({ s }) => s === "pending").map(({ t }) => t)
      .sort((a, b) => String(a.expiresAt || a.pickupDate).localeCompare(String(b.expiresAt || b.pickupDate)))[0],
    [withStatus]
  );

  const tab = chosenTab ?? (counts.active > 0 ? "active" : "all");

  // Live tickets first, soonest deadline on top.
  const rank = { pending: 0, collected: 1, expired: 2 };
  const visible = withStatus
    .filter(({ s }) => tab === "all" || (tab === "active" ? s === "pending" : s === tab))
    .sort(
      (a, b) =>
        (rank[a.s] ?? 3) - (rank[b.s] ?? 3) ||
        new Date(a.t.expiresAt || 0).getTime() - new Date(b.t.expiresAt || 0).getTime()
    )
    .map(({ t }) => t);

  const dash = (v) => (loading ? "—" : v);

  return (
    <>
      <div className="page-header">
        <h1>{isDonor ? "Pickup Tickets" : "My Collection Tickets"}</h1>
        <p>
          {isDonor
            ? "Scan a beneficiary's QR code (in the sidebar) at pickup to confirm and complete the donation."
            : "Show the QR code to the donor at pickup - they scan it to confirm the hand-over."}
        </p>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconTicket size={26} color="var(--primary)" />}
          label="Ready to collect"
          value={dash(counts.active)}
          sub="Active tickets"
        />
        <StatCard
          icon={<IconClock size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Next pickup"
          value={loading ? "—" : next ? formatDate(next.pickupDate) : "None"}
          sub={next ? (next.item?.name || "Food item") : "No pickups scheduled"}
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Collected"
          value={dash(counts.collected)}
          sub="Completed pickups"
        />
        <StatCard
          icon={<IconWeight size={26} color="var(--primary)" />}
          label="Picked up"
          value={dash(collectedKg)}
          unit="KG"
          sub="Across collected tickets"
        />
      </Stagger>

      <div className="card fr-panel">
        <div className="fr-toolbar">
          <div className="fr-tabs" role="tablist" aria-label="Filter tickets">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`fr-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="fr-count">{dash(counts[t.key])}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="tk-list">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="tk-card tk-skel" aria-hidden="true" />)}
          </div>
        ) : visible.length > 0 ? (
          <div className="tk-list">
            {visible.map((t) => (
              <CollectionTicketCard key={t.id} ticket={t} isDonor={isDonor} forFeed={user.role === "farm"} onShowQr={setQrTicket} />
            ))}
          </div>
        ) : (
          <EmptyTicketsState isDonor={isDonor} filtered={all.length > 0} />
        )}
      </div>

      {qrTicket && <QrModal ticket={qrTicket} onClose={() => setQrTicket(null)} />}
    </>
  );
}
