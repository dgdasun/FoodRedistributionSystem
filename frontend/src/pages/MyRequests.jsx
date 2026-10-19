import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Inbox, MessageCircleWarning, Search, ClipboardList } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import Pagination from "../components/Pagination.jsx";
import { imageFor } from "../foodImages.js";

const PAGE_SIZE = 8;

const STATUS = {
  pending: { label: "Pending", tone: "warn" },
  counter_offer: { label: "Partial offer", tone: "violet" },
  approved: { label: "Approved", tone: "ok", icon: true },
  collected: { label: "Collected", tone: "ok", icon: true },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Declined", tone: "muted" },
};

const URGENCY_TONE = { critical: "danger", high: "warn", medium: "info", low: "ok" };

const TABS = [
  { key: "all", label: "All", test: () => true },
  { key: "action", label: "Needs action", test: (r) => r.status === "counter_offer" },
  { key: "pending", label: "Pending", test: (r) => r.status === "pending" },
  { key: "approved", label: "Approved", test: (r) => r.status === "approved" },
  { key: "collected", label: "Collected", test: (r) => r.status === "collected" },
  { key: "closed", label: "Closed", test: (r) => r.status === "rejected" || r.status === "cancelled" },
];

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className={`bx-badge ${s.tone}`}>
      {s.icon ? <Check size={12} strokeWidth={3} /> : <span className="bx-dot" />}
      {s.label}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const u = urgency || "medium";
  return (
    <span className={`bx-badge ${URGENCY_TONE[u] || "info"}${u === "critical" ? " pulse" : ""}`}>
      <span className="bx-dot" />
      {u}
    </span>
  );
}

/** Three-step track: submitted -> approved -> collected. */
function Progress({ status }) {
  const step = { pending: 1, counter_offer: 1, approved: 2, collected: 3 }[status] ?? 1;
  const stopped = status === "rejected" || status === "cancelled";
  return (
    <span className="bx-progress" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={stopped ? (i === 1 ? "stop" : "") : i <= step ? "on" : ""} />
      ))}
    </span>
  );
}

/** Warm, encouraging modal explaining why a request was declined. */
function RejectionReasonModal({ request, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="bx-modal-backdrop" onClick={onClose}>
      <div className="bx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="bx-modal-body">
          <div className="bx-empty-icon" style={{ background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" }}>
            <MessageCircleWarning size={26} />
          </div>
          <h3>Why was this declined?</h3>
          <p className="bx-req-sub" style={{ margin: "0 0 16px" }}>
            {request.item?.name || "This item"} · {request.quantityKg} kg requested
          </p>

          <div className="bx-notice danger" style={{ marginBottom: 10 }}>
            {request.rejectionReason || "The donor was unable to fulfil this request."}
          </div>

          <div className="bx-notice info">
            <span>
              Food supplies fluctuate quickly, but your efforts matter! Check{" "}
              <Link to="/browse" style={{ fontWeight: 700, color: "var(--primary)" }} onClick={onClose}>
                Available Food
              </Link>{" "}
              for newly posted surplus items nearby.
            </span>
          </div>

          <div className="bx-modal-actions">
            <button className="bx-btn outline" onClick={onClose}>
              Close
            </button>
            <Link to="/browse" className="bx-btn primary" onClick={onClose}>
              Browse food
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestRow({ r, busy, onAct, onReason }) {
  const isPartial = r.status === "counter_offer";
  const approvedQty = r.approvedQuantityKg ?? r.quantityKg;
  const submitted = r.createdAt
    ? new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className={isPartial ? "bx-req needs-action" : "bx-req"}>
      <img className="bx-req-thumb" src={imageFor(r.item?.category)} alt="" loading="lazy" />

      <div style={{ minWidth: 0 }}>
        <span className="bx-req-name">{r.item?.name || "—"}</span>
        <span className="bx-req-sub">
          {r.item?.category || "Item"} · {submitted}
        </span>
      </div>

      <div className="bx-req-qty">
        <strong>
          {isPartial ? approvedQty : r.quantityKg}
          <small>{isPartial ? `kg of ${r.quantityKg}` : "kg"}</small>
        </strong>
        <UrgencyBadge urgency={r.urgency} />
      </div>

      <div className="bx-req-status">
        <StatusBadge status={r.status} />
        <Progress status={r.status} />
        {isPartial && (
          <span className="bx-req-note violet">
            Donor can give {approvedQty} kg of the {r.quantityKg} kg requested
          </span>
        )}
        {r.status === "pending" && <span className="bx-req-note">Awaiting donor response</span>}
        {r.status === "approved" && <span className="bx-req-note">Ticket ready in My Tickets</span>}
        {r.status === "cancelled" && <span className="bx-req-note">You declined this offer</span>}
      </div>

      <div className="bx-req-actions">
        {isPartial && (
          <>
            <button type="button" disabled={busy} className="bx-btn primary" onClick={() => onAct(r.id, "approved")}>
              <Check size={14} /> Accept {approvedQty} kg
            </button>
            <button type="button" disabled={busy} className="bx-btn danger" onClick={() => onAct(r.id, "cancelled")}>
              <X size={14} /> Decline
            </button>
          </>
        )}
        {r.status === "approved" && (
          <Link to="/tickets" className="bx-btn ghost">
            View ticket
          </Link>
        )}
        {r.status === "rejected" && (
          <button type="button" className="bx-btn outline" onClick={() => onReason(r)}>
            View reason
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const [reasonRequest, setReasonRequest] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api.get(`/requests?beneficiaryId=${user.id}`).then((d) => {
      setRequests(d.requests || []);
      setLoading(false);
    });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, requests.filter(t.test).length])),
    [requests]
  );

  const collectedKg = useMemo(
    () =>
      Math.round(
        requests
          .filter((r) => r.status === "collected")
          .reduce((s, r) => s + Number(r.approvedQuantityKg ?? r.quantityKg ?? 0), 0) * 10
      ) / 10,
    [requests]
  );

  const filtered = useMemo(() => requests.filter(TABS.find((t) => t.key === tab).test), [requests, tab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const act = async (id, status) => {
    setError("");
    setBusyId(id);
    try {
      await api.patch(`/requests/${id}`, { status });
      await load();
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const switchTab = (key) => {
    setTab(key);
    setPage(1);
  };

  return (
    <>
      <section className="bx-hero">
        <div className="bx-hero-text">
          <span className="bx-eyebrow">
            <ClipboardList size={13} /> Request tracker
          </span>
          <h1>My Requests</h1>
          <p>Track every request from submission to collection, and respond to partial offers from donors.</p>
        </div>
        <div className="bx-stats">
          <div className="bx-stat">
            <span className="bx-stat-value">{loading ? "–" : requests.length}</span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--primary)" }} /> Total
            </span>
          </div>
          <div className="bx-stat">
            <span className="bx-stat-value">{loading ? "–" : counts.pending + counts.action}</span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--warning)" }} /> In progress
            </span>
          </div>
          <div className="bx-stat">
            <span className="bx-stat-value">
              {loading ? "–" : collectedKg}
              <small>kg</small>
            </span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--status-ok-fg)" }} /> Received
            </span>
          </div>
        </div>
      </section>

      {counts.action > 0 && (
        <div className="bx-notice warn">
          <MessageCircleWarning size={18} color="var(--status-warn-fg)" />
          <div>
            <strong>
              {counts.action} partial offer{counts.action === 1 ? "" : "s"} waiting for you
            </strong>
            A donor can only cover part of your request. Accept or decline so the food can move on.
          </div>
        </div>
      )}

      {error && (
        <div className="bx-notice danger">
          <X size={18} />
          <div>{error}</div>
        </div>
      )}

      <div className="bx-tabs" role="tablist" aria-label="Filter requests by status">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "bx-tab active" : "bx-tab"}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
            <span className={`bx-tab-count${t.key === "action" && counts.action > 0 && tab !== t.key ? " alert" : ""}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bx-req-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 86, borderRadius: 20 }} aria-hidden="true" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bx-empty">
          <div className="bx-empty-icon">{requests.length === 0 ? <Inbox size={26} /> : <Search size={26} />}</div>
          <h3>{requests.length === 0 ? "No requests yet" : "Nothing here"}</h3>
          <p>
            {requests.length === 0
              ? "Find surplus food near you and send your first request."
              : "No requests have this status right now."}
          </p>
          {requests.length === 0 ? (
            <Link to="/browse" className="bx-btn primary">
              Browse available food
            </Link>
          ) : (
            <button type="button" className="bx-btn outline" onClick={() => switchTab("all")}>
              Show all requests
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bx-req-list">
            {paged.map((r) => (
              <RequestRow key={r.id} r={r} busy={busyId === r.id} onAct={act} onReason={setReasonRequest} />
            ))}
          </div>
          <div className="bx-pagination">
            <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}

      {reasonRequest && <RejectionReasonModal request={reasonRequest} onClose={() => setReasonRequest(null)} />}
    </>
  );
}
