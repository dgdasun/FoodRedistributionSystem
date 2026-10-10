import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { IconCommunity, IconShieldCheck, IconSparkle, IconBot, IconSpinner } from "../components/Icons.jsx";
import Pagination from "../components/Pagination.jsx";

const TABS = [
  { key: "all", label: "All" },
  { key: "beneficiary", label: "Beneficiary" },
  { key: "farm", label: "Farm / Compost" },
];

const PAGE_SIZE = 7;

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  counter_offer: "bg-violet-100 text-violet-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL = {
  counter_offer: "Partial Offer",
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize ${cls}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const u = urgency || "medium";
  if (u === "critical") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize bg-rose-50 text-rose-700 ring-1 ring-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
        {u}
      </span>
    );
  }
  if (u === "high") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize bg-orange-100 text-orange-700">
        {u}
      </span>
    );
  }
  if (u === "low") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize bg-sky-100 text-sky-700">
        {u}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize bg-slate-100 text-slate-600">
      {u}
    </span>
  );
}

function QuantityBadge({ qty }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold text-emerald-800 bg-emerald-50 ring-1 ring-emerald-100">
      {qty} kg
    </span>
  );
}

/** Renders the "92% Match - Closest Distance" style badge for one request's AI insight. */
function AIMatchBadge({ insight }) {
  if (!insight) {
    return <span className="text-[11.5px] text-slate-400">—</span>;
  }
  const pct = Math.round(insight.score * 100);
  const reason = insight.rank === 1 ? insight.justification : `Priority #${insight.rank}`;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
      <IconSparkle size={12} color="var(--status-violet-fg)" />
      {pct}% Match {reason ? `- ${reason}` : ""}
    </span>
  );
}

function computeJustification(req, siblings) {
  if (!req || siblings.length <= 1) return "Best Match";
  const minDistance = Math.min(...siblings.map((s) => (s.distanceKm ?? Infinity)));
  const maxUrgency = Math.max(...siblings.map((s) => URGENCY_RANK[s.urgency] || 2));
  const reqUrgency = URGENCY_RANK[req.urgency] || 2;
  if (req.distanceKm === minDistance) return "Closest Distance";
  if (reqUrgency === maxUrgency && maxUrgency >= 3) return "Highest Urgency";
  return "Best Overall Fit";
}

function RequestDetailModal({ request, onClose, onAct, aiInsight }) {
  const beneficiary = request.beneficiary;
  const [approveQty, setApproveQty] = useState(request.quantityKg);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 2 }}>{request.item?.name || "Item"}</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "0 0 16px" }}>
          Requested {request.createdAt ? new Date(request.createdAt).toLocaleString() : ""}
        </p>

        <div style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: beneficiary ? 4 : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--icon-chip)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconCommunity size={18} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: 13.5, display: "block" }}>
                {beneficiary?.organizationName || beneficiary?.name || "Unknown organization"}
              </strong>
              <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>
                {beneficiary?.orgType || "Beneficiary"} {beneficiary?.location ? `· ${beneficiary.location}` : ""}
              </span>
            </div>
          </div>
          {beneficiary?.verified && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--status-ok-fg)", fontWeight: 600 }}>
              <IconShieldCheck size={14} color="var(--status-ok-fg)" />
              Verified organization
            </div>
          )}
        </div>

        {aiInsight && (
          <div className="rounded-xl bg-violet-50 ring-1 ring-violet-200 px-3.5 py-3 mb-4 flex items-start gap-2.5">
            <IconBot size={18} color="var(--status-violet-fg)" className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[12.5px] font-bold text-violet-800">
                {Math.round(aiInsight.score * 100)}% Match · Priority #{aiInsight.rank}
              </div>
              <div className="text-[11.5px] text-violet-600">
                {aiInsight.rank === 1 ? aiInsight.justification : `Ranked #${aiInsight.rank} of ${aiInsight.total} pending requests for this item.`}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 13 }}>
          <div>
            <div style={{ color: "var(--text-light)", fontSize: 11.5, marginBottom: 2 }}>Quantity requested</div>
            <strong>{request.quantityKg} kg</strong>
          </div>
          <div>
            <div style={{ color: "var(--text-light)", fontSize: 11.5, marginBottom: 2 }}>Urgency</div>
            <strong style={{ textTransform: "capitalize" }}>{request.urgency}</strong>
          </div>
          <div>
            <div style={{ color: "var(--text-light)", fontSize: 11.5, marginBottom: 2 }}>Distance</div>
            <strong>{request.distanceKm} km</strong>
          </div>
          <div>
            <div style={{ color: "var(--text-light)", fontSize: 11.5, marginBottom: 2 }}>Status</div>
            <span className={`badge-status ${request.status}`}>{STATUS_LABEL[request.status] || request.status}</span>
          </div>
        </div>

        {request.status === "pending" ? (
          showReject ? (
            <div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <label>Reason (shown to the beneficiary)</label>
                <textarea
                  rows={3}
                  style={{ resize: "vertical" }}
                  placeholder="e.g. Inventory allocated to an urgent community kitchen request"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-danger-outline"
                  style={{ flex: 1 }}
                  onClick={() => onAct(request.id, "rejected", { reason: rejectReason })}
                >
                  Confirm Decline
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReject(false)}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, color: "var(--text-light)", whiteSpace: "nowrap" }}>
                  Approve quantity (kg)
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={request.quantityKg}
                  step={0.1}
                  style={{ width: 90 }}
                  value={approveQty}
                  onChange={(e) => setApproveQty(e.target.value)}
                />
                <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>of {request.quantityKg} kg requested</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => onAct(request.id, "approved", { approvedQuantityKg: Number(approveQty) })}
                >
                  {Number(approveQty) < request.quantityKg ? "Send Counter-Offer" : "Accept Request"}
                </button>
                <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={() => setShowReject(true)}>
                  Decline
                </button>
              </div>
            </div>
          )
        ) : (
          <button className="btn btn-outline" style={{ width: "100%" }} onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/** Donor's "Food Requests" page: beneficiary and farm/compost requests together, with a scanner to complete approved pickups of either type. */
export default function Requests() {
  const { user } = useAuth();
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);

  const [aiOn, setAiOn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiMap, setAiMap] = useState({});

  const load = () => api.get(`/requests?donorId=${user.id}`).then((d) => setAll(d.requests || []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const act = async (id, status, extra = {}) => {
    await api.patch(`/requests/${id}`, { status, ...extra });
    setSelected(null);
    load();
  };

  const requests = tab === "all" ? all : all.filter((r) => (r.beneficiary?.role || "beneficiary") === tab);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedRequests = requests.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const fetchAiInsights = async () => {
    if (aiOn) {
      setAiOn(false);
      return;
    }
    setAiOn(true);
    setAiLoading(true);
    setAiError("");
    try {
      const pendingItemIds = [...new Set(all.filter((r) => r.status === "pending").map((r) => r.itemId))];
      const results = await Promise.all(
        pendingItemIds.map((itemId) =>
          api.get(`/requests/recommendations/${itemId}`).then((d) => ({ itemId, ranking: d.ranking || [] })).catch(() => null)
        )
      );

      const nextMap = {};
      for (const result of results) {
        if (!result) continue;
        const siblings = all.filter((r) => r.itemId === result.itemId && r.status === "pending");
        result.ranking.forEach((entry, idx) => {
          const req = siblings.find((s) => s.id === entry.requestId);
          nextMap[entry.requestId] = {
            score: entry.score,
            rank: idx + 1,
            total: result.ranking.length,
            justification: computeJustification(req, siblings),
          };
        });
      }
      setAiMap(nextMap);
    } catch (e) {
      setAiError(e.message || "Could not load AI insights right now.");
      setAiOn(false);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Food Requests</h1>
        <p>Review requests from beneficiaries and farm/compost partners, accept or decline, then scan their QR code (in the sidebar) to confirm pickup.</p>
      </div>

      <div className="toolbar">
        <div className="pill-tabs">
          {TABS.map((t) => (
            <div key={t.key} className={`pill-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)} style={{ cursor: "pointer" }}>
              {t.label}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchAiInsights}
          disabled={aiLoading}
          className={
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-70 disabled:cursor-wait " +
            (aiOn
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-white text-violet-700 ring-1 ring-violet-300 hover:bg-violet-50")
          }
        >
          {aiLoading ? (
            <>
              <IconSpinner size={15} className="animate-spin" />
              Analyzing requests...
            </>
          ) : aiOn ? (
            <>
              <IconBot size={15} />
              AI Insights: ON
            </>
          ) : (
            <>
              <IconSparkle size={15} />
              Ask AI for Match Insights
            </>
          )}
        </button>
      </div>

      {aiError && (
        <div className="card" style={{ marginBottom: 16, color: "var(--danger)", fontSize: 13 }}>
          {aiError}
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Requester</th>
              <th>Type</th>
              <th>Item</th>
              <th>Qty (kg)</th>
              <th>Urgency</th>
              <th>Distance</th>
              <th>Status</th>
              {aiOn && <th>AI Insight</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pagedRequests.map((r) => {
              const isFarm = r.beneficiary?.role === "farm";
              return (
                <tr key={r.id}>
                  <td>
                    <strong style={{ display: "block", fontSize: 13.5 }}>
                      {r.beneficiary?.organizationName || r.beneficiary?.name || "Unknown"}
                    </strong>
                    <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>{r.beneficiary?.orgType || "Beneficiary"}</span>
                  </td>
                  <td>
                    <span className={`badge-status ${isFarm ? "reserved" : "approved"}`}>{isFarm ? "Farm" : "Beneficiary"}</span>
                  </td>
                  <td>{r.item?.name}</td>
                  <td><QuantityBadge qty={r.quantityKg} /></td>
                  <td><UrgencyBadge urgency={r.urgency} /></td>
                  <td>{r.distanceKm} km</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  {aiOn && (
                    <td>
                      <AIMatchBadge insight={aiMap[r.id]} />
                    </td>
                  )}
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => setSelected(r)}>
                      View{r.status === "pending" ? " & Accept" : ""}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {requests.length === 0 && <div className="empty-state">No requests yet.</div>}
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAct={act}
          aiInsight={aiOn ? aiMap[selected.id] : null}
        />
      )}
    </>
  );
}
