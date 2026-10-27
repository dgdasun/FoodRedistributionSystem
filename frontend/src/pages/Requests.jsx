import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { imageFor } from "../foodImages.js";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import LottieState from "../components/LottieState.jsx";
import { SkeletonLine } from "../components/Skeleton.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { IconInbox, IconWeight, IconMapPin, IconClock, IconShieldCheck, IconSparkle } from "../components/Icons.jsx";
import { AIMatchOverview, AIRecommendationPanel } from "../components/AIRecommendations.jsx";
import { useAIRecommendations } from "../hooks/useAIRecommendations.js";
import RequestDetailModal from "../components/RequestDetailModal.jsx";
import "../styles/food-requests.css";

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { key: "pending", label: "To review" },
  { key: "counter_offer", label: "Partial offers" },
  { key: "approved", label: "Approved" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

const TYPE_TABS = [
  { key: "all", label: "All types" },
  { key: "beneficiary", label: "Beneficiary" },
  { key: "farm", label: "Farm / Compost" },
];

const STATUS_META = {
  pending: { label: "Awaiting decision", tone: "warn" },
  counter_offer: { label: "Partial offer sent", tone: "violet" },
  approved: { label: "Approved", tone: "ok" },
  collected: { label: "Collected", tone: "ok" },
  rejected: { label: "Declined", tone: "danger" },
  cancelled: { label: "Offer refused", tone: "muted" },
};

const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const URGENCY_TONE = { critical: "danger", high: "warn", medium: "info", low: "ok" };

function inTab(r, tab) {
  if (tab === "all") return true;
  if (tab === "approved") return r.status === "approved" || r.status === "collected";
  if (tab === "closed") return r.status === "rejected" || r.status === "cancelled";
  return r.status === tab;
}

function typeOf(r) {
  return r.beneficiary?.role === "farm" ? "farm" : "beneficiary";
}

function timeAgo(value) {
  if (!value) return null;
  const t = typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : Date.parse(value);
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatKg(kg) {
  const n = Number(kg) || 0;
  return Number.isInteger(n) ? n : n.toFixed(1);
}

function RequestCard({ request: r, onOpen }) {
  const status = STATUS_META[r.status] || { label: r.status, tone: "muted" };
  const urgency = r.urgency || "medium";
  const isPending = r.status === "pending";
  const name = r.beneficiary?.organizationName || r.beneficiary?.name || "Unknown requester";
  const isFarm = typeOf(r) === "farm";
  const ago = timeAgo(r.createdAt);
  // Pending cards are coloured by urgency (what to act on first); decided ones by outcome.
  const stripTone = isPending ? URGENCY_TONE[urgency] : status.tone;

  return (
    <article className={`fr-card fr-strip-${stripTone}${isPending ? " fr-actionable" : ""}`}>
      <header className="fr-head">
        <div className={`fr-avatar ${isFarm ? "fr-avatar-farm" : ""}`} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="fr-who">
          <div className="fr-name">
            {name}
            {r.beneficiary?.verified && (
              <span className="fr-verified" title="Verified organization">
                <IconShieldCheck size={13} />
              </span>
            )}
          </div>
          <div className="fr-org">
            <span className={`fr-type ${isFarm ? "fr-type-farm" : ""}`}>{isFarm ? "Farm / Compost" : "Beneficiary"}</span>
            {r.beneficiary?.orgType && r.beneficiary.orgType !== "Farm" && <span>{r.beneficiary.orgType}</span>}
          </div>
        </div>
        <span className={`fr-pill fr-pill-${URGENCY_TONE[urgency]}`}>
          <span className={`fr-dot${urgency === "critical" ? " fr-dot-pulse" : ""}`} />
          {urgency}
        </span>
      </header>

      <div className="fr-item">
        <img src={imageFor(r.item?.category)} alt="" loading="lazy" />
        <div className="fr-item-text">
          <div className="fr-item-qty">
            <strong>{formatKg(r.quantityKg)} kg</strong> of {r.item?.name || "item"}
          </div>
          {r.status === "counter_offer" && r.approvedQuantityKg != null && (
            <div className="fr-item-note">You offered {formatKg(r.approvedQuantityKg)} kg</div>
          )}
          {r.item?.category && <div className="fr-item-cat">{r.item.category}</div>}
        </div>
      </div>

      <div className="fr-meta">
        {r.distanceKm != null && (
          <span>
            <IconMapPin size={14} color="currentColor" />
            {r.distanceKm} km away
          </span>
        )}
        {ago && (
          <span>
            <IconClock size={14} color="currentColor" />
            {ago}
          </span>
        )}
      </div>

      <footer className="fr-foot">
        <span className={`fr-status fr-status-${status.tone}`}>{status.label}</span>
        <button type="button" className={isPending ? "fr-btn fr-btn-primary" : "fr-btn"} onClick={() => onOpen(r)}>
          {isPending ? "Review request" : "View details"}
        </button>
      </footer>
    </article>
  );
}

function LoadingCards() {
  return Array.from({ length: 4 }, (_, i) => (
    <div key={i} className="fr-card" aria-hidden="true">
      <div className="fr-head">
        <SkeletonLine width={42} height={42} radius={999} />
        <div className="fr-who">
          <SkeletonLine width="60%" height={13} style={{ marginBottom: 7 }} />
          <SkeletonLine width="35%" height={10} />
        </div>
      </div>
      <SkeletonLine height={60} radius={14} style={{ margin: "14px 0" }} />
      <SkeletonLine width="45%" height={10} />
    </div>
  ));
}

/** Donor's "Food Requests" page: beneficiary and farm/compost requests together, reviewed through RequestDetailModal. */
export default function Requests() {
  const { user } = useAuth();
  const [all, setAll] = useState(null);
  const [tab, setTab] = useState(null); // null until data arrives: "To review" if anything waits, else "All"
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [aiItemId, setAiItemId] = useState(null);

  const load = () => api.get(`/requests?donorId=${user.id}`).then((d) => setAll(d.requests || []));

  useEffect(() => {
    load().catch(() => setAll([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const act = async (id, status, extra = {}) => {
    await api.patch(`/requests/${id}`, { status, ...extra });
    setSelected(null);
    load();
  };

  const list = all || [];
  const ai = useAIRecommendations(list);

  // One AI card per item that still has requests awaiting a decision.
  const aiItems = Object.values(
    list
      .filter((r) => r.status === "pending")
      .reduce((acc, r) => {
        acc[r.itemId] = acc[r.itemId] || { itemId: r.itemId, name: r.item?.name || "Item", pendingCount: 0 };
        acc[r.itemId].pendingCount += 1;
        return acc;
      }, {})
  );
  // Closes itself once the item's last pending request is decided.
  const aiItem = aiItems.find((i) => String(i.itemId) === String(aiItemId));

  const ofType = useMemo(() => list.filter((r) => type === "all" || typeOf(r) === type), [list, type]);

  const counts = useMemo(() => {
    const c = {};
    STATUS_TABS.forEach((t) => (c[t.key] = ofType.filter((r) => inTab(r, t.key)).length));
    return c;
  }, [ofType]);

  const activeTab = tab ?? (all === null || counts.pending > 0 ? "pending" : "all");

  const pendingKg = list.filter((r) => r.status === "pending").reduce((s, r) => s + (Number(r.quantityKg) || 0), 0);

  const q = query.trim().toLowerCase();
  const visible = ofType
    .filter((r) => inTab(r, activeTab))
    .filter((r) => {
      if (!q) return true;
      return [r.beneficiary?.organizationName, r.beneficiary?.name, r.item?.name].some((f) => (f || "").toLowerCase().includes(q));
    })
    .sort((a, b) => {
      // Waiting requests first, most urgent on top; then newest.
      const pa = a.status === "pending" ? 0 : 1;
      const pb = b.status === "pending" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const u = (URGENCY_RANK[a.urgency] ?? 2) - (URGENCY_RANK[b.urgency] ?? 2);
      if (pa === 0 && u !== 0) return u;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = visible.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const resetPage = (fn) => (value) => {
    fn(value);
    setPage(1);
  };

  const loading = all === null;
  const dash = (v) => (loading ? "—" : v);

  return (
    <>
      <div className="page-header">
        <h1>Food Requests</h1>
        <p>
          Review requests from beneficiaries and farm/compost partners, accept or decline, then scan their QR code (in the
          sidebar) to confirm pickup.
        </p>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconInbox size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="To review"
          value={dash(counts.pending ?? 0)}
          sub="Waiting for your decision"
        />
        <StatCard
          icon={<IconSparkle size={26} color="var(--status-violet-fg)" />}
          iconBg="var(--status-violet-bg)"
          label="Partial offers"
          value={dash(counts.counter_offer ?? 0)}
          sub="Waiting for the requester"
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Approved"
          value={dash(counts.approved ?? 0)}
          sub="Tickets issued"
        />
        <StatCard
          icon={<IconWeight size={26} color="var(--primary)" />}
          label="Requested"
          value={dash(Math.round(pendingKg * 10) / 10)}
          unit="KG"
          sub="Across pending requests"
        />
      </Stagger>

      <AIMatchOverview
        items={aiItems}
        rankings={ai.rankings}
        loading={ai.loading}
        error={ai.error}
        selectedId={aiItem?.itemId}
        onSelect={setAiItemId}
      />

      {aiItem && (
        <AIRecommendationPanel
          key={aiItem.itemId}
          itemName={aiItem.name}
          ranking={ai.rankings[aiItem.itemId] ?? null}
          onView={(id) => setSelected(list.find((r) => r.id === id) || null)}
          onClose={() => setAiItemId(null)}
        />
      )}

      <div className="card fr-panel">
        <div className="fr-toolbar">
          <div className="fr-tabs" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                className={`fr-tab${activeTab === t.key ? " active" : ""}`}
                onClick={() => resetPage(setTab)(t.key)}
              >
                {t.label}
                <span className="fr-count">{dash(counts[t.key] ?? 0)}</span>
              </button>
            ))}
          </div>
          <div className="fr-tools">
            <select
              className="fr-select"
              aria-label="Requester type"
              value={type}
              onChange={(e) => resetPage(setType)(e.target.value)}
            >
              {TYPE_TABS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="fr-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Search requester or item"
                value={query}
                onChange={(e) => resetPage(setQuery)(e.target.value)}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="fr-grid">
            <LoadingCards />
          </div>
        ) : visible.length === 0 ? (
          <LottieState
            title={list.length === 0 ? "No requests yet" : activeTab === "pending" ? "All caught up" : "Nothing here"}
            message={
              list.length === 0
                ? "When beneficiaries or farms request your listed food, they appear here."
                : activeTab === "pending"
                  ? "No requests are waiting for your decision."
                  : "Try another status, type or search term."
            }
          />
        ) : (
          <div className="fr-grid">
            {paged.map((r) => (
              <RequestCard key={r.id} request={r} onOpen={setSelected} />
            ))}
          </div>
        )}

        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAct={act}
          aiInsight={ai.insightFor(selected)}
        />
      )}
    </>
  );
}
