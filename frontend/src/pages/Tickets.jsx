import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Package, MapPin, Calendar, Clock, Download, Ticket as TicketIcon } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  collected: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  expired: "bg-rose-50 text-rose-700 border border-rose-200",
};

const STATUS_LABELS = {
  pending: "Pending",
  collected: "Collected",
  expired: "Expired",
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border border-slate-200";
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

function DetailRow({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Icon size={16} className="text-emerald-600 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

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

/**
 * Derives the Admin-configured QR collection window state for a ticket: the
 * deadline, whether it has lapsed, and copy for the pill badge / time column.
 */
function useCollectionWindow(ticket, now) {
  const expiresAt = ticket.expiresAt ? new Date(ticket.expiresAt) : null;
  const isSettled = ticket.status === "collected";

  if (!expiresAt) return { expiresAt: null, isExpired: false, isSettled, badgeText: null, validUntilText: null };

  const msLeft = expiresAt.getTime() - now;
  const isExpired = !isSettled && msLeft <= 0;
  const validUntilText = `Valid until ${formatClockTime(expiresAt)}`;

  let badgeText;
  if (isSettled) {
    badgeText = null;
  } else if (isExpired) {
    badgeText = "⏱️ Window Expired";
  } else if (msLeft <= HOUR_MS) {
    badgeText = `⏱️ ${formatDuration(msLeft)} left`;
  } else if (ticket.collectionWindowHours) {
    badgeText = `⏱️ ${ticket.collectionWindowHours} hr Collection Window`;
  } else {
    badgeText = `⏱️ ${formatDuration(msLeft)} left`;
  }

  return { expiresAt, isExpired, isSettled, badgeText, validUntilText };
}

function CollectionWindowBadge({ text, isExpired }) {
  if (!text) return null;
  const style = isExpired
    ? "bg-rose-50 text-rose-700 border border-rose-200"
    : "bg-amber-50 text-amber-700 border border-amber-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      {text}
    </span>
  );
}

/**
 * Reusable ticket-pass card used across the beneficiary "My Collection Tickets"
 * page and the donor "Pickup Tickets" page.
 */
export function CollectionTicketCard({ ticket, isDonor = false, onAction }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isDonor || !ticket.qrCode) return;
    let cancelled = false;
    QRCode.toDataURL(ticket.qrCode, { margin: 1, width: 220 })
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ticket.qrCode, isDonor]);

  // Keep the collection-window countdown live without a page refresh.
  useEffect(() => {
    if (ticket.status !== "pending" || !ticket.expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, [ticket.status, ticket.expiresAt]);

  const { isExpired, badgeText, validUntilText } = useCollectionWindow(ticket, now);
  const displayStatus = isExpired ? "expired" : ticket.status;

  const handleDownload = () => {
    onAction?.("download", ticket);
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ticket-${ticket.id}.png`;
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
      {!isDonor && (
        <>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Pickup QR code" className="w-28 h-28 rounded-md" />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center text-slate-400 text-xs">Loading…</div>
            )}
            <span className="text-[11px] font-medium text-slate-500 mt-1.5">Scan at Donor Hub</span>
          </div>
          <div className="hidden lg:block w-px self-stretch bg-slate-200" />
        </>
      )}

      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
          <h3 className="text-xl font-bold text-slate-900">{ticket.item?.name || "Food Item"}</h3>
          <span className="bg-slate-100 text-slate-600 font-mono text-xs px-2.5 py-1 rounded-md">
            #{ticket.id}
          </span>
          <StatusBadge status={displayStatus} />
          <CollectionWindowBadge text={badgeText} isExpired={isExpired} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          <DetailRow icon={Package}>{ticket.quantityKg} kg Surplus</DetailRow>
          <DetailRow icon={MapPin}>{ticket.pickupLocation}</DetailRow>
          <DetailRow icon={Calendar}>{ticket.pickupDate}</DetailRow>
          <DetailRow icon={Clock}>
            {ticket.collectionWindowHours ? `${ticket.collectionWindowHours}h pickup window` : "Pickup window"}
            {validUntilText && <span className="text-slate-400"> ({validUntilText})</span>}
          </DetailRow>
        </div>
      </div>

      {!isDonor && (
        <div className="flex flex-row lg:flex-col gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={16} />
            Download Ticket
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyTicketsState({ isDonor }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <TicketIcon size={24} className="text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No tickets yet</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        {isDonor
          ? "Confirmed pickup tickets from beneficiaries will show up here."
          : "Once your request is approved, your pickup ticket will appear here."}
      </p>
    </div>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const isDonor = user.role === "donor";

  const load = () => {
    const query = isDonor ? `donorId=${user.id}` : `beneficiaryId=${user.id}`;
    api.get(`/tickets?${query}`).then((d) => setTickets(d.tickets));
  };

  useEffect(() => {
    load();
  }, [user.id]);

  return (
    <>
      <div className="page-header">
        <h1>{isDonor ? "Pickup Tickets" : "My Collection Tickets"}</h1>
        <p>{isDonor ? "Scan a beneficiary's QR code (in the sidebar) at pickup to confirm and complete the donation." : "Show this QR code to the donor at pickup for verification."}</p>
      </div>

      {tickets.length > 0 ? (
        <div className="flex flex-col gap-4">
          {tickets.map((t) => (
            <CollectionTicketCard key={t.id} ticket={t} isDonor={isDonor} />
          ))}
        </div>
      ) : (
        <EmptyTicketsState isDonor={isDonor} />
      )}
    </>
  );
}
