import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { IconUpload, IconPlus } from "../components/Icons.jsx";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import DonationTimeline from "../components/DonationTimeline.jsx";
import Pagination from "../components/Pagination.jsx";

// No "Fresh" tab: the platform only carries near-expiry surplus and expired
// stock, so a fresh listing can never exist to filter for.
const TABS = [
  { key: "all", label: "All" },
  { key: "surplus", label: "Surplus" },
  { key: "expired", label: "Expired" },
  { key: "collected", label: "Collected" },
];

// Matches the other table pages (Requests, My Requests, Admin Users).
const PAGE_SIZE = 8;

function AddItemForm({ user, onCreated, onClose }) {
  // Mirrors how the backend builds it, so the form shows the value that will
  // actually be saved rather than a guess.
  const donorPickup = [user.organizationName, user.location].filter(Boolean).join(", ");
  const [form, setForm] = useState({
    name: "",
    category: "Vegetables",
    batchNumber: "",
    quantityKg: "",
    expiryDate: "",
  });
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // Cooked meals are handed out as individually packed meals, not weighed, so
  // the donor counts portions instead of kilograms.
  const isPortioned = form.category === "Cooked Meals";
  const unit = isPortioned ? "portions" : "kg";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/donations", { ...form, donorId: user.id, quantityKg: Number(form.quantityKg) });
      toast.success(`${form.name || "Item"} listed - ${form.quantityKg} ${unit} added to your inventory.`);
      onCreated();
      onClose();
    } catch (e2) {
      // The API refuses anything too far from expiry; surface that inline AND
      // as a toast, with the shake as a third, non-textual cue.
      setError(e2.message);
      toast.error(e2.message);
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">
        <h3>➕ Add Inventory Item</h3>
        <span className="view-all" onClick={onClose} style={{ cursor: "pointer" }}>
          Close
        </span>
      </div>
      <form onSubmit={submit} className={shake ? "shake" : undefined}>
        <div className="form-grid-2">
          <div className="form-row">
            <label>Product name</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Category</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              {["Vegetables", "Dairy", "Bakery", "Cooked Meals", "Fruits", "Packaged Goods", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-row">
            <label>Batch number</label>
            <input value={form.batchNumber} onChange={(e) => update("batchNumber", e.target.value)} placeholder="e.g. B-3001" />
          </div>
          <div className="form-row">
            <label>{isPortioned ? "Quantity (portions)" : "Quantity (kg)"}</label>
            <input
              type="number"
              min={isPortioned ? 1 : undefined}
              step={isPortioned ? 1 : "any"}
              value={form.quantityKg}
              onChange={(e) => update("quantityKg", e.target.value)}
              placeholder={isPortioned ? "e.g. 25 meal packs" : undefined}
              required
            />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-row">
            <label>Expiry date</label>
            <input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Pickup location</label>
            {/* Not an input: the backend stamps every listing with the donor's
                registered location, so an editable field here would be a lie. */}
            <p className="form-static">
              {donorPickup || "No location on your profile yet"}
              <Link to="/profile" className="form-static-link">
                Change in Profile
              </Link>
            </p>
          </div>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add Item"}</button>
      </form>
    </div>
  );
}

function RecommendationPanel({ itemId, onClose }) {
  const [ranking, setRanking] = useState(null);

  useEffect(() => {
    api.get(`/requests/recommendations/${itemId}`).then((d) => setRanking(d.ranking));
  }, [itemId]);

  const approve = async (requestId) => {
    await api.patch(`/requests/${requestId}`, { status: "approved" });
    onClose(true);
  };
  const reject = async (requestId) => {
    await api.patch(`/requests/${requestId}`, { status: "rejected" });
    onClose(true);
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">
        <h3>🤖 AI Beneficiary Recommendations</h3>
        <span className="view-all" onClick={() => onClose(false)} style={{ cursor: "pointer" }}>
          Close
        </span>
      </div>
      {ranking === null && <p style={{ fontSize: 13, color: "var(--text-mid)" }}>Scoring pending requests...</p>}
      {ranking && ranking.length === 0 && <div className="empty-state">No pending requests for this item.</div>}
      {ranking &&
        ranking.map((r, idx) => (
          <div className="donation-row" key={r.requestId}>
            <div className="donation-thumb">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</div>
            <div className="donation-info">
              <strong>{r.beneficiaryName}</strong>
              <span>AI priority score: {r.score}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => approve(r.requestId)}>
              Approve
            </button>
            <button className="btn btn-danger-outline btn-sm" style={{ marginLeft: 6 }} onClick={() => reject(r.requestId)}>
              Reject
            </button>
          </div>
        ))}
    </div>
  );
}

export default function MyDonations() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [recoFor, setRecoFor] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");
  // Which row has its progress timeline expanded. One at a time - the table is
  // already wide, and two open timelines push the rows too far apart to scan.
  const [trackingId, setTrackingId] = useState(null);
  const [page, setPage] = useState(1);

  const load = () => api.get(`/donations?donorId=${user.id}`).then((d) => setDonations(d.donations));

  useEffect(() => {
    load();
  }, [user.id]);

  const filtered = tab === "all" ? donations : donations.filter((d) => d.status === tab);

  // pageSafe clamps rather than the state itself, so deleting or filtering down
  // to fewer pages can never strand the table on an empty one.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // Switching tab starts a different list, so go back to its first page, and
  // drop any open timeline - the row it belonged to may not be on screen now.
  const selectTab = (key) => {
    setTab(key);
    setPage(1);
    setTrackingId(null);
  };

  const goToPage = (next) => {
    setPage(next);
    setTrackingId(null);
  };

  const togglePublish = async (item) => {
    await api.patch(`/donations/${item.id}`, { published: !item.published });
    load();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("donorId", user.id);
    try {
      const res = await api.upload("/donations/upload", fd);
      setUploadMsg(`✅ ${res.message} (${res.surplusDetected} flagged as surplus, ${res.expiredDetected} expired)`);
      load();
    } catch (err) {
      setUploadMsg("❌ " + err.message);
    }
    e.target.value = "";
  };

  return (
    <>
      <div className="page-header">
        <h1>My Donations</h1>
        <p>Upload inventory, publish surplus food, and review beneficiary requests.</p>
      </div>

      <div className="toolbar">
        <div className="pill-tabs">
          {TABS.map((t) => (
            <div key={t.key} className={`pill-tab ${tab === t.key ? "active" : ""}`} onClick={() => selectTab(t.key)} style={{ cursor: "pointer" }}>
              {t.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/sample_inventory.csv"
            download="sample_inventory.csv"
            className="btn btn-outline btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Download Sample CSV
          </a>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconUpload size={15} />
            Upload CSV
            <input type="file" accept=".csv" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconPlus size={15} />
            Add Item
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className="card" style={{ marginBottom: 16, fontSize: 13 }}>
          {uploadMsg}
          <div style={{ marginTop: 6, color: "var(--text-light)" }}>
            Expected CSV headers: <code>name,category,batchNumber,quantityKg,expiryDate</code>
            <div style={{ marginTop: 4 }}>
              Pickup location comes from your profile, so it is not needed in the file (a
              <code> pickupLocation</code> column in an older template is ignored).
            </div>
          </div>
        </div>
      )}

      {showForm && <AddItemForm user={user} onCreated={load} onClose={() => setShowForm(false)} />}
      {recoFor && (
        <RecommendationPanel
          itemId={recoFor}
          onClose={(refresh) => {
            setRecoFor(null);
            if (refresh) load();
          }}
        />
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Published</th>
              <th>Progress</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((d) => (
              <React.Fragment key={d.id}>
              <tr>
                <td>{d.name}</td>
                <td>{d.category}</td>
                <td>{d.batchNumber}</td>
                <td>{d.quantityKg} {d.category === "Cooked Meals" ? "portions" : "kg"}</td>
                <td>
                  {d.expiryDate}
                  <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                    {d.daysUntilExpiry >= 0 ? `${d.daysUntilExpiry}d left` : "expired"}
                  </div>
                </td>
                <td>
                  <span className={`badge-status ${d.status}`}>{d.status}</span>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => togglePublish(d)}>
                    {d.published ? "Unpublish" : "Publish"}
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setTrackingId((id) => (id === d.id ? null : d.id))}
                    aria-expanded={trackingId === d.id}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    {trackingId === d.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Track
                  </button>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => setRecoFor(d.id)}>
                    View Requests
                  </button>
                </td>
              </tr>
              {trackingId === d.id && (
                <tr className="timeline-row">
                  <td colSpan={9}>
                    <DonationTimeline item={d} donorId={user.id} />
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state">No items in this category yet.</div>}
        <Pagination page={pageSafe} totalPages={totalPages} onChange={goToPage} />
      </div>
    </>
  );
}
