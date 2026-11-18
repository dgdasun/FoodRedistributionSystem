import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Check, X, MapPin, CalendarDays, Ticket, Info, Loader2, Inbox, ArrowRight, Leaf } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { useToast } from "../components/Toast.jsx";
import { IconInbox, IconSparkle, IconShieldCheck, IconWeight } from "../components/Icons.jsx";
import { imageFor } from "../foodImages.js";
import "../styles/food-requests.css";
import "../styles/my-requests.css";

const PAGE_SIZE = 8;

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "counter_offer", label: "Partial offers" },
  { key: "approved", label: "Approved" },
  { key: "collected", label: "Collected" },
  { key: "closed", label: "Closed", statuses: ["rejected", "cancelled"] },
];

const STATUS = {
  pending: { label: "Pending", tone: "warn" },
  counter_offer: { label: "Partial offer", tone: "violet" },
  approved: { label: "Approved", tone: "ok" },
  collected: { label: "Collected", tone: "ok" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Declined", tone: "muted" },
};

const URGENCY_TONE = { critical: "danger", high: "warn", medium: "info", low: "muted" };

const inTab = (r, key) => {
  if (key === "all") return true;
  const tab = TABS.find((t) => t.key === key);
  return tab?.statuses ? tab.statuses.includes(r.status) : r.status === key;
};

function relativeDay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Three-step track: submitted -> approved -> collected. */
function Progress({ status }) {
  const step = { pending: 1, counter_offer: 1, approved: 2, collected: 3 }[status] ?? 1;
  const stopped = status === "rejected" || status === "cancelled";
  return (
    <span className="mr-progress" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={stopped ? (i === 1 ? "stop" : "") : i <= step ? "on" : ""} />
      ))}
    </span>
  );
}

/** Warm, encouraging modal explaining why a request was declined. */
function RejectionReasonModal({ request, isFarm, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal mr-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mr-reason-title">
        <div className="rq-head">
          <div className="rq-head-icon mr-head-danger"><Info size={20} /></div>
          <div className="rq-head-text">
            <h3 id="mr-reason-title">Why was this declined?</h3>
            <span>{request.item?.name || "This item"} · {request.quantityKg} kg requested</span>
          </div>
          <button type="button" className="mr-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="rq-body">
          <div className="mr-reason">{request.rejectionReason || "The donor was unable to fulfil this request."}</div>
          <div className="mr-encourage">
            <Leaf size={16} />
            <span>
              Supplies change quickly - new {isFarm ? "expired stock" : "surplus"} is posted throughout the day, so check back
              for items nearby.
            </span>
          </div>
        </div>
        <div className="rq-foot">
          <div className="rq-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
            <Link to="/browse" className="btn btn-primary" onClick={onClose}>
              Browse {isFarm ? "expired food" : "available food"} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyRequests() {
  const { user } = useAuth();
  const toast = useToast();
  const isFarm = user.role === "farm";
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reasonRequest, setReasonRequest] = useState(null);
  const [busy, setBusy] = useState(null); // { id, status }

  const load = () =>
    api
      .get(`/requests?beneficiaryId=${user.id}`)
      .then((d) => setRequests(d.requests || []))
      .catch((e) => {
        toast.error(e.message);
        setRequests((prev) => prev || []);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const all = requests || [];
  const loading = requests === null;

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => { c[t.key] = all.filter((r) => inTab(r, t.key)).length; });
    return c;
  }, [all]);

  const receivedKg = useMemo(
    () => Math.round(all.filter((r) => r.status === "collected").reduce((s, r) => s + Number(r.approvedQuantityKg ?? r.quantityKg ?? 0), 0) * 10) / 10,
    [all]
  );

  // Partial offers wait on this user, so they always sort to the top.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((r) => inTab(r, tab))
      .filter((r) => !q || [r.item?.name, r.item?.category, r.item?.pickupLocation].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
      .sort((a, b) => (b.status === "counter_offer") - (a.status === "counter_offer") || String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [all, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const resetView = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  const act = async (r, status) => {
    setBusy({ id: r.id, status });
    try {
      await api.patch(`/requests/${r.id}`, { status });
      toast.success(
        status === "approved"
          ? `Offer accepted - your ticket for ${r.approvedQuantityKg ?? r.quantityKg} kg is in My Tickets.`
          : "Offer declined."
      );
      await load();
    } catch (e) {
      toast.error(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const dash = (v) => (loading ? "—" : v);

  return (
    <>
      <div className="page-header">
        <h1>My Requests</h1>
        <p>
          Track the {isFarm ? "expired food" : "food"} requests you've submitted, respond to partial offers and find your
          pickup tickets.
        </p>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconInbox size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Awaiting donor"
          value={dash(counts.pending)}
          sub="Pending requests"
        />
        <StatCard
          icon={<IconSparkle size={26} color="var(--status-violet-fg)" />}
          iconBg="var(--status-violet-bg)"
          label="Needs your reply"
          value={dash(counts.counter_offer)}
          sub="Partial offers to review"
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Approved"
          value={dash(counts.approved)}
        />
        <StatCard
          icon={<IconWeight size={26} color="var(--primary)" />}
          label={isFarm ? "Collected for feed" : "Food received"}
          value={dash(receivedKg)}
          unit="KG"
          sub={`${counts.collected || 0} collection${counts.collected === 1 ? "" : "s"} completed`}
        />
      </Stagger>

      {!loading && counts.counter_offer > 0 && tab !== "counter_offer" && (
        <button type="button" className="mr-callout" onClick={() => resetView(setTab)("counter_offer")}>
          <span className="mr-callout-icon"><IconSparkle size={18} color="currentColor" /></span>
          <span className="mr-callout-text">
            <strong>
              {counts.counter_offer} partial offer{counts.counter_offer === 1 ? "" : "s"} waiting for you
            </strong>
            <span>A donor can't cover the full amount - accept the smaller quantity or decline.</span>
          </span>
          <span className="mr-callout-cta">Review <ArrowRight size={14} /></span>
        </button>
      )}

      <div className="card fr-panel">
        <div className="fr-toolbar">
          <div className="fr-tabs" role="tablist" aria-label="Filter by status">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`fr-tab${tab === t.key ? " active" : ""}`}
                onClick={() => resetView(setTab)(t.key)}
              >
                {t.label}
                <span className="fr-count">{dash(counts[t.key])}</span>
              </button>
            ))}
          </div>
          <div className="fr-tools">
            <label className="fr-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search item, category or location"
                value={query}
                onChange={(e) => resetView(setQuery)(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mr-list">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mr-item mr-skel" aria-hidden="true">
                <span className="mr-skel-thumb" />
                <span className="mr-skel-line" />
                <span className="mr-skel-line short" />
              </div>
            ))}

          {!loading &&
            paged.map((r) => {
              const st = STATUS[r.status] || STATUS.pending;
              const urgency = r.urgency || "medium";
              const isPartial = r.status === "counter_offer";
              const offered = r.approvedQuantityKg ?? r.quantityKg;
              const rowBusy = busy?.id === r.id;
              return (
                <article key={r.id} className={`mr-item mr-tone-${st.tone}${isPartial ? " mr-actionable" : ""}`}>
                  <div className="mr-main">
                    <img className="mr-thumb" src={imageFor(r.item?.category)} alt="" loading="lazy" />
                    <div className="mr-info">
                      <div className="mr-title">
                        <strong>{r.item?.name || "Food item"}</strong>
                        <span className={`mr-urgency mr-pill-${URGENCY_TONE[urgency] || "info"}`}>
                          {urgency === "critical" && <i />}
                          {urgency}
                        </span>
                      </div>
                      <div className="mr-meta">
                        {r.item?.category && <span>{r.item.category}</span>}
                        {r.item?.pickupLocation && <span><MapPin size={12} /> {r.item.pickupLocation}</span>}
                        <span><CalendarDays size={12} /> {relativeDay(r.createdAt)}</span>
                      </div>
                    </div>

                    <div className="mr-qty">
                      {isPartial ? (
                        <>
                          <strong>{offered} kg</strong>
                          <span>offered of {r.quantityKg} kg</span>
                        </>
                      ) : (
                        <>
                          <strong>{r.status === "approved" || r.status === "collected" ? offered : r.quantityKg} kg</strong>
                          <span>{r.status === "collected" ? "received" : "requested"}</span>
                        </>
                      )}
                    </div>

                    <div className="mr-status">
                      <span className={`mr-badge mr-pill-${st.tone}`}>
                        {(r.status === "approved" || r.status === "collected") && <Check size={12} strokeWidth={3} />}
                        {st.label}
                      </span>
                      <Progress status={r.status} />
                    </div>

                    <div className="mr-actions">
                      {r.status === "pending" && <span className="mr-note"><Loader2 size={13} /> Awaiting donor response</span>}
                      {r.status === "approved" && (
                        <Link to="/tickets" className="mr-btn mr-btn-soft">
                          <Ticket size={14} /> View ticket
                        </Link>
                      )}
                      {r.status === "collected" && <span className="mr-note mr-note-ok"><Check size={13} /> Picked up</span>}
                      {r.status === "rejected" && (
                        <button type="button" className="mr-btn mr-btn-ghost" onClick={() => setReasonRequest(r)}>
                          <Info size={14} /> View reason
                        </button>
                      )}
                      {r.status === "cancelled" && <span className="mr-note">You declined this offer</span>}
                    </div>
                  </div>

                  {isPartial && (
                    <div className="mr-offer">
                      <span>
                        The donor can give <strong>{offered} kg</strong> of the {r.quantityKg} kg you asked for.
                      </span>
                      <div className="mr-offer-actions">
                        <button
                          type="button"
                          className="mr-btn mr-btn-danger"
                          disabled={rowBusy}
                          onClick={() => act(r, "cancelled")}
                        >
                          {rowBusy && busy.status === "cancelled" ? <Loader2 size={14} className="mr-spin" /> : <X size={14} />} Decline
                        </button>
                        <button
                          type="button"
                          className="mr-btn mr-btn-primary"
                          disabled={rowBusy}
                          onClick={() => act(r, "approved")}
                        >
                          {rowBusy && busy.status === "approved" ? <Loader2 size={14} className="mr-spin" /> : <Check size={14} />} Accept {offered} kg
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="mr-empty">
            <div className="mr-empty-icon"><Inbox size={26} /></div>
            <strong>{all.length === 0 ? "No requests yet" : "Nothing here"}</strong>
            <p>
              {all.length === 0
                ? `Find ${isFarm ? "expired stock for feed or compost" : "near-expiry surplus"} and send your first request.`
                : query
                  ? `No requests match “${query}”.`
                  : "No requests with this status."}
            </p>
            {all.length === 0 && (
              <Link to="/browse" className="btn btn-primary btn-sm">
                Browse {isFarm ? "expired food" : "available food"}
              </Link>
            )}
          </div>
        )}

        <div className="mr-foot">
          {!loading && filtered.length > 0 && (
            <span>
              {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          )}
          <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {reasonRequest && (
        <RejectionReasonModal request={reasonRequest} isFarm={isFarm} onClose={() => setReasonRequest(null)} />
      )}
    </>
  );
}
