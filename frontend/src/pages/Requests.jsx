import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import Pagination from "../components/Pagination.jsx";
import { AIMatchOverview, AIRecommendationPanel } from "../components/AIRecommendations.jsx";
import { useAIRecommendations } from "../hooks/useAIRecommendations.js";
import RequestDetailModal from "../components/RequestDetailModal.jsx";

const TABS = [
  { key: "all", label: "All" },
  { key: "beneficiary", label: "Beneficiary" },
  { key: "farm", label: "Farm / Compost" },
];

const PAGE_SIZE = 7;

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  counter_offer: "bg-violet-100 text-violet-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
  collected: "bg-emerald-100 text-emerald-700",
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

/** Donor's "Food Requests" page: beneficiary and farm/compost requests together, with a scanner to complete approved pickups of either type. */
export default function Requests() {
  const { user } = useAuth();
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [aiItemId, setAiItemId] = useState(null);


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

  const ai = useAIRecommendations(all);

  // One AI card per item that still has requests awaiting a decision.
  const aiItems = Object.values(
    all
      .filter((r) => r.status === "pending")
      .reduce((acc, r) => {
        acc[r.itemId] = acc[r.itemId] || { itemId: r.itemId, name: r.item?.name || "Item", pendingCount: 0 };
        acc[r.itemId].pendingCount += 1;
        return acc;
      }, {})
  );
  // Closes itself once the item's last pending request is decided.
  const aiItem = aiItems.find((i) => String(i.itemId) === String(aiItemId));

  const requests = tab === "all" ? all : all.filter((r) => (r.beneficiary?.role || "beneficiary") === tab);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedRequests = requests.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab]);

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
      </div>

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
          onView={(id) => setSelected(all.find((r) => r.id === id) || null)}
          onClose={() => setAiItemId(null)}
        />
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
          aiInsight={ai.insightFor(selected)}
        />
      )}
    </>
  );
}
