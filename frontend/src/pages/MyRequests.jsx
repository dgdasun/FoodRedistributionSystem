import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 8;

const CATEGORY_IMAGE = {
  "Cooked Meals": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80",
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&auto=format&fit=crop&q=80",
  Vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&auto=format&fit=crop&q=80",
  Dairy: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=100&auto=format&fit=crop&q=80",
  Fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100&auto=format&fit=crop&q=80",
  "Packaged Goods": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=100&auto=format&fit=crop&q=80",
  Other: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&auto=format&fit=crop&q=80",
};

function CategoryIcon({ category }) {
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden ring-1 ring-slate-100 flex-shrink-0"
      title={category}
    >
      <img
        src={CATEGORY_IMAGE[category] || CATEGORY_IMAGE.Other}
        alt={category}
        className="w-full h-full object-cover"
      />
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-emerald-100 text-emerald-700">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Approved
      </span>
    );
  }
  if (status === "collected") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-emerald-100 text-emerald-700">
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Collected
      </span>
    );
  }
  if (status === "counter_offer") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-violet-100 text-violet-700">
        Partial Offer
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-rose-100 text-rose-700">
        Rejected
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-slate-100 text-slate-500">
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-amber-100 text-amber-700">
      Pending
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
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold capitalize bg-blue-100 text-blue-700">
      {u}
    </span>
  );
}

/** Warm, encouraging modal explaining why a request was declined. */
function RejectionReasonModal({ request, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 420, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Why was this declined?</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "0 0 14px" }}>
          {request.item?.name || "This item"} · {request.quantityKg} kg requested
        </p>

        <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 mb-3 text-[13px] text-rose-800">
          {request.rejectionReason || "The donor was unable to fulfil this request."}
        </div>

        <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 mb-4 text-[13px] text-emerald-800">
          Food supplies fluctuate quickly, but your efforts matter! Please check the{" "}
          <Link to="/browse" className="font-semibold underline" onClick={onClose}>
            Available Food
          </Link>{" "}
          page for newly posted surplus items nearby.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/browse" className="btn btn-primary" style={{ flex: 1, textAlign: "center" }} onClick={onClose}>
            Browse Available Food
          </Link>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
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
  const toast = useToast();
  const isFarm = user.role === "farm";
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
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

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
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

  return (
    <>
      <div className="page-header">
        <h1>My Requests</h1>
        <p>Track the status of the food requests you've submitted.</p>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty (kg)</th>
              <th>Urgency</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => {
              const isPartial = r.status === "counter_offer";
              const approvedQty = r.approvedQuantityKg ?? r.quantityKg;
              const busy = busyId === r.id;
              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={r.item?.category} />
                      <div>
                        <strong style={{ display: "block", fontSize: 13.5 }}>{r.item?.name || "—"}</strong>
                        <span style={{ fontSize: 11.5, color: "var(--text-light)" }}>{r.item?.category || ""}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isPartial ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold text-violet-800 bg-violet-50 ring-1 ring-violet-100">
                        {approvedQty} kg <span className="font-normal text-violet-500 ml-1">/ {r.quantityKg} kg</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-bold text-emerald-800 bg-emerald-50 ring-1 ring-emerald-100">
                        {r.quantityKg} kg
                      </span>
                    )}
                  </td>
                  <td>
                    <UrgencyBadge urgency={r.urgency} />
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text-mid)" }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={r.status} />
                      {isPartial && (
                        <span className="text-[11px] text-violet-500 font-medium">
                          {approvedQty} kg Approved (Requested: {r.quantityKg} kg)
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {isPartial && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[var(--primary-strong)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-60 transition-colors"
                          onClick={() => act(r.id, "approved")}
                        >
                          Accept {approvedQty} kg
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold text-rose-600 ring-1 ring-rose-200 bg-white hover:bg-rose-50 disabled:opacity-60 transition-colors"
                          onClick={() => act(r.id, "cancelled")}
                        >
                          Decline Offer
                        </button>
                      </div>
                    )}
                    {r.status === "rejected" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
                        onClick={() => setReasonRequest(r)}
                      >
                        View Reason
                      </button>
                    )}
                    {r.status === "pending" && (
                      <span className="text-[12px] text-slate-400">Awaiting donor response</span>
                    )}
                    {r.status === "cancelled" && (
                      <span className="text-[12px] text-slate-400">You declined this offer</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && requests.length === 0 && (
          <div className="empty-state">You haven't requested any items yet.</div>
        )}
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>

      {reasonRequest && (
        <RejectionReasonModal request={reasonRequest} onClose={() => setReasonRequest(null)} />
      )}

      {reasonRequest && <RejectionReasonModal request={reasonRequest} onClose={() => setReasonRequest(null)} />}
    </>
  );
}
