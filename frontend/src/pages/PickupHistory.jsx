import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { imageFor } from "../foodImages.js";
import { IconCalendar, IconMapPin, IconWeight, IconTruck, IconClock, IconTicket } from "../components/Icons.jsx";
import StatCard from "../components/StatCard.jsx";
import Pagination from "../components/Pagination.jsx";
import LottieState from "../components/LottieState.jsx";
import { SkeletonLine } from "../components/Skeleton.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import "../styles/pickup-history.css";

const PAGE_SIZE = 8;

const STATUS_META = {
  collected: { label: "Collected", tone: "ok" },
  pending: { label: "Awaiting pickup", tone: "warn" },
  expired: { label: "Expired", tone: "danger" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting" },
  { key: "collected", label: "Collected" },
  { key: "expired", label: "Expired" },
];

/**
 * A pending ticket whose collection window has closed is expired, even if the
 * backend has not swept it yet - same rule as the beneficiary Tickets page.
 */
function statusOf(ticket, now) {
  if (ticket.status === "collected" || ticket.status === "expired") return ticket.status;
  if (ticket.expiresAt && new Date(ticket.expiresAt).getTime() <= now) return "expired";
  return "pending";
}

function formatDay(isoDate) {
  if (!isoDate) return "Date to be confirmed";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatKg(kg) {
  const n = Number(kg) || 0;
  return Number.isInteger(n) ? n : n.toFixed(1);
}

function TicketRow({ ticket, status }) {
  const meta = STATUS_META[status];
  const item = ticket.item || {};
  return (
    <article className={`ph-ticket ph-tone-${meta.tone}`}>
      <img className="ph-thumb" src={imageFor(item.category)} alt="" loading="lazy" />
      <div className="ph-body">
        <div className="ph-title-row">
          <h3 className="ph-name">{item.name || "Item"}</h3>
          <span className={`ph-pill ph-pill-${meta.tone}`}>
            <span className="ph-dot" />
            {meta.label}
          </span>
        </div>
        <div className="ph-sub">
          {item.category && <span>{item.category}</span>}
          <span className="ph-code">#{ticket.id}</span>
        </div>
        <div className="ph-meta">
          {ticket.pickupTime && (
            <span>
              <IconClock size={14} color="currentColor" />
              {ticket.pickupTime}
            </span>
          )}
          <span className="ph-meta-loc">
            <IconMapPin size={14} color="currentColor" />
            {ticket.pickupLocation || "—"}
          </span>
        </div>
      </div>
      <div className="ph-qty">
        <strong>{formatKg(ticket.quantityKg)}</strong>
        <span>kg</span>
      </div>
    </article>
  );
}

function LoadingList() {
  return (
    <div className="ph-group" aria-hidden="true">
      <SkeletonLine width={180} height={12} style={{ marginBottom: 14 }} />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="ph-ticket">
          <SkeletonLine width={64} height={64} radius={14} />
          <div className="ph-body">
            <SkeletonLine width="45%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonLine width="30%" height={11} style={{ marginBottom: 10 }} />
            <SkeletonLine width="60%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PickupHistory() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    api
      .get(`/tickets?donorId=${user.id}`)
      .then((d) => setTickets(d.tickets || []))
      .catch((e) => {
        setError(e.message || "Could not load pickups.");
        setTickets([]);
      });
  }, [user.id]);

  const withStatus = useMemo(
    () =>
      (tickets || [])
        .map((t) => ({ ticket: t, status: statusOf(t, now) }))
        // Newest pickup first.
        .sort((a, b) => String(b.ticket.pickupDate || "").localeCompare(String(a.ticket.pickupDate || ""))),
    [tickets, now]
  );

  const counts = useMemo(() => {
    const c = { all: withStatus.length, pending: 0, collected: 0, expired: 0 };
    withStatus.forEach(({ status }) => (c[status] += 1));
    return c;
  }, [withStatus]);

  const collectedKg = withStatus
    .filter((x) => x.status === "collected")
    .reduce((sum, x) => sum + (Number(x.ticket.quantityKg) || 0), 0);

  const q = query.trim().toLowerCase();
  const visible = withStatus.filter(({ ticket, status }) => {
    if (filter !== "all" && status !== filter) return false;
    if (!q) return true;
    return [ticket.item?.name, ticket.id, ticket.pickupLocation].some((f) => (f || "").toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = visible.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // Group the current page by pickup day for the timeline.
  const groups = [];
  paged.forEach((entry) => {
    const day = entry.ticket.pickupDate || "";
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(entry);
    else groups.push({ day, items: [entry] });
  });

  const chooseFilter = (key) => {
    setFilter(key);
    setPage(1);
  };

  const loading = tickets === null;

  return (
    <>
      <div className="page-header">
        <h1>Pickup History</h1>
        <p>Every collection ticket issued for your donations, from approval to hand-over.</p>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconTicket size={26} color="var(--primary)" />}
          label="Total pickups"
          value={loading ? "—" : counts.all}
          sub="Tickets issued"
        />
        <StatCard
          icon={<IconWeight size={26} color="var(--status-ok-fg)" />}
          label="Handed over"
          value={loading ? "—" : Math.round(collectedKg * 10) / 10}
          unit="KG"
          sub={`${counts.collected} collected`}
        />
        <StatCard
          icon={<IconClock size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Awaiting pickup"
          value={loading ? "—" : counts.pending}
          sub="Window still open"
        />
        <StatCard
          icon={<IconTruck size={26} color="var(--status-danger-fg)" />}
          iconBg="var(--status-danger-bg)"
          label="Expired"
          value={loading ? "—" : counts.expired}
          sub="Not collected in time"
        />
      </Stagger>

      <div className="card ph-card">
        <div className="ph-toolbar">
          <div className="ph-filters" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`ph-filter${filter === f.key ? " active" : ""}`}
                onClick={() => chooseFilter(f.key)}
              >
                {f.label}
                <span className="ph-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <label className="ph-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search item, ticket or place"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {error && <div className="ph-error">{error}</div>}

        {loading ? (
          <LoadingList />
        ) : visible.length === 0 ? (
          <LottieState
            title={tickets.length === 0 ? "No pickups yet" : "Nothing matches"}
            message={
              tickets.length === 0
                ? "A ticket appears here each time you approve a food request."
                : "Try another status or search term."
            }
          />
        ) : (
          <div className="ph-timeline">
            {groups.map((g) => (
              <section key={g.day || "tbc"} className="ph-group">
                <h2 className="ph-day">
                  <IconCalendar size={14} color="currentColor" />
                  {formatDay(g.day)}
                </h2>
                <div className="ph-list">
                  {g.items.map(({ ticket, status }) => (
                    <TicketRow key={ticket.id} ticket={ticket} status={status} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}
