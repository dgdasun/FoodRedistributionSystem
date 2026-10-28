import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import { Link } from "react-router-dom";
import {
  ChevronDown, Plus, Upload, Download, X, MapPin, Package, Search, CheckCircle2, AlertTriangle,
  Loader2, PackageOpen,
} from "lucide-react";
import DonationTimeline from "../components/DonationTimeline.jsx";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { IconDonations, IconSparkle, IconShieldCheck, IconWeight } from "../components/Icons.jsx";
import { imageFor } from "../foodImages.js";
import { UNITS, PACK_UNITS, unitOf, packText, packTotal } from "../units.js";
import "../styles/food-requests.css";
import "../styles/donations.css";

// No "Fresh" tab: the platform only carries near-expiry surplus and expired
// stock, so a fresh listing can never exist to filter for.
const TABS = [
  { key: "all", label: "All" },
  { key: "surplus", label: "Surplus" },
  { key: "expired", label: "Expired" },
  { key: "collected", label: "Collected" },
];

const SORTS = [
  // Default: what the donor just added is the first row they see.
  { key: "newest", label: "Newest first", cmp: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) },
  { key: "expiry", label: "Expiry: soonest", cmp: (a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)) },
  { key: "expiry-desc", label: "Expiry: latest", cmp: (a, b) => String(b.expiryDate).localeCompare(String(a.expiryDate)) },
  { key: "qty", label: "Quantity: most", cmp: (a, b) => Number(b.quantityKg) - Number(a.quantityKg) },
  { key: "name", label: "Name: A-Z", cmp: (a, b) => String(a.name).localeCompare(String(b.name)) },
];

// "Packaged Goods" is no longer offered: packaged food is listed under its own
// food type with the Items / packets unit instead. Older listings keep it.
const CATEGORIES = ["Vegetables", "Dairy", "Bakery", "Cooked Meals", "Fruits", "Other"];

const STATUS_LABEL = { surplus: "Surplus", expired: "Expired", collected: "Collected", reserved: "Reserved", fresh: "Fresh" };

// Matches the other table pages (Requests, My Requests, Admin Users).
const PAGE_SIZE = 8;


function expiryInfo(d) {
  const days = Number(d.daysUntilExpiry);
  if (d.status === "collected") return { text: "Handed over", tone: "ok" };
  if (!Number.isFinite(days)) return { text: "", tone: "muted" };
  if (days < 0) return { text: `Expired ${-days}d ago`, tone: "danger" };
  if (days === 0) return { text: "Expires today", tone: "danger" };
  if (days <= 1) return { text: "1 day left", tone: "warn" };
  return { text: `${days} days left`, tone: days <= 3 ? "warn" : "ok" };
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function AddItemModal({ user, onCreated, onClose }) {
  // Mirrors how the backend builds it, so the form shows the value that will
  // actually be saved rather than a guess.
  const donorPickup = [user.organizationName, user.location].filter(Boolean).join(", ");
  const [form, setForm] = useState({
    name: "",
    category: "Vegetables",
    batchNumber: "",
    unit: "",
    quantityKg: "",
    packSize: "",
    packUnit: "kg",
    expiryDate: "",
  });
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // The quantity means nothing until its unit is known, so it stays locked
  // until one is picked; switching unit clears it rather than silently turning
  // "5 kg" into "5 liters".
  const unit = UNITS.find((u) => u.key === form.unit);
  const pickUnit = (key) => setForm((f) => ({ ...f, unit: key, quantityKg: key === f.unit ? f.quantityKg : "" }));
  const isCount = form.unit === "items";

  const submit = async (e) => {
    e.preventDefault();
    if (!unit) {
      setError("Select a unit before entering the quantity.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const body = { ...form, donorId: user.id, quantityKg: Number(form.quantityKg) };
      if (isCount) body.packSize = Number(form.packSize);
      else {
        delete body.packSize;
        delete body.packUnit;
      }
      await api.post("/donations", body);
      const each = isCount ? ` (${packText(body)})` : "";
      toast.success(`${form.name || "Item"} listed - ${form.quantityKg} ${unit.short}${each} added to your inventory.`);
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
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal dn-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dn-add-title">
        <form onSubmit={submit} className={shake ? "shake" : undefined}>
          <div className="rq-head">
            <div className="rq-head-icon"><Plus size={20} /></div>
            <div className="rq-head-text">
              <h3 id="dn-add-title">Add inventory item</h3>
              <span>Near-expiry items are flagged as surplus automatically.</span>
            </div>
            <button type="button" className="dn-icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="rq-body">
            <div className="dn-cat-picker">
              <span className="dn-label">Category</span>
              <div className="dn-cats" role="radiogroup" aria-label="Category">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={form.category === c}
                    className={form.category === c ? "dn-cat active" : "dn-cat"}
                    onClick={() => update("category", c)}
                  >
                    <img src={imageFor(c)} alt="" />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-row">
                <label htmlFor="dn-name">Product name</label>
                <input id="dn-name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="form-row">
                <label htmlFor="dn-batch">Batch number</label>
                <input id="dn-batch" value={form.batchNumber} onChange={(e) => update("batchNumber", e.target.value)} placeholder="e.g. B-3001" />
              </div>
            </div>
            <div className="dn-unit-picker">
              <span className="dn-label" id="dn-unit-label">Unit</span>
              <div className="dn-units" role="radiogroup" aria-labelledby="dn-unit-label">
                {UNITS.map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    role="radio"
                    aria-checked={form.unit === u.key}
                    className={form.unit === u.key ? "dn-unit active" : "dn-unit"}
                    onClick={() => pickUnit(u.key)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-row">
                <label htmlFor="dn-qty">{unit ? `Quantity (${unit.short})` : "Quantity"}</label>
                <input
                  id="dn-qty"
                  type="number"
                  min={isCount ? 1 : 0.1}
                  step={isCount ? 1 : "any"}
                  value={form.quantityKg}
                  onChange={(e) => update("quantityKg", e.target.value)}
                  placeholder={
                    !unit ? "Select a unit first"
                      : isCount ? "e.g. 25 packets"
                      : form.unit === "liters" ? "e.g. 12.5" : "e.g. 20"
                  }
                  disabled={!unit}
                  aria-describedby={!unit ? "dn-qty-hint" : undefined}
                  required
                />
                {!unit && <small id="dn-qty-hint" className="dn-hint">Choose kg, liters or items/packets to enter a quantity.</small>}
              </div>
              <div className="form-row">
                <label htmlFor="dn-expiry">Expiry date</label>
                <input id="dn-expiry" type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} required />
              </div>
            </div>

            {/* A packet count alone doesn't tell a charity how many people it
                feeds, so packets also carry their size. */}
            {isCount && (
              <div className="dn-pack">
                <label htmlFor="dn-pack-size">Amount in one packet</label>
                <div className="dn-pack-row">
                  <input
                    id="dn-pack-size"
                    type="number"
                    min={0.01}
                    step="any"
                    value={form.packSize}
                    onChange={(e) => update("packSize", e.target.value)}
                    placeholder={form.packUnit === "liters" ? "e.g. 0.5" : "e.g. 0.4"}
                    required
                  />
                  <div className="dn-units" role="radiogroup" aria-label="Packet size unit">
                    {PACK_UNITS.map((u) => (
                      <button
                        key={u.key}
                        type="button"
                        role="radio"
                        aria-checked={form.packUnit === u.key}
                        className={form.packUnit === u.key ? "dn-unit active" : "dn-unit"}
                        onClick={() => update("packUnit", u.key)}
                      >
                        {u.short}
                      </button>
                    ))}
                  </div>
                </div>
                <small className="dn-hint">
                  {Number(form.packSize) > 0 && Number(form.quantityKg) > 0
                    ? `${form.quantityKg} packets × ${packText({ ...form, packSize: Number(form.packSize) })} = ${packTotal(form.quantityKg, { ...form, packSize: Number(form.packSize) })} in total`
                    : "Helps organizations work out how many people the packets can feed."}
                </small>
              </div>
            )}

            {/* Not an input: the backend stamps every listing with the donor's
                registered location, so an editable field here would be a lie. */}
            <div className="dn-pickup">
              <MapPin size={16} />
              <div>
                <span>Pickup location</span>
                <strong>{donorPickup || "No location on your profile yet"}</strong>
              </div>
              <Link to="/profile" className="dn-link">Change</Link>
            </div>

            {error && <p className="dn-error">{error}</p>}
          </div>

          <div className="rq-foot">
            <div className="rq-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Adding…" : <><Plus size={15} /> Add item</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * What the CSV upload did with each row's category: spellings it corrected on
 * its own, and rows it held back because it could not tell which category was
 * meant. A held-back row is imported from here once the donor picks one, so
 * the file never needs uploading twice.
 */
function UploadCategoryReport({ corrections, review, categories, onImport, onSkip }) {
  if (!corrections?.length && !review?.length) return null;
  return (
    <div className="dn-catfix">
      {corrections?.length > 0 && (
        <details className="dn-catfix-done">
          <summary>
            {corrections.length} {corrections.length === 1 ? "category was" : "categories were"} corrected automatically
          </summary>
          <ul>
            {corrections.map((c) => (
              <li key={c.row}>
                Row {c.row}: <q>{c.originalCategory}</q> → <strong>{c.category}</strong>
                <em>
                  {c.matchType === "ALIAS_MATCH" ? " (other name)" : ` (spelling, ${c.editDistance} letter${c.editDistance === 1 ? "" : "s"})`}
                </em>
              </li>
            ))}
          </ul>
        </details>
      )}
      {review?.length > 0 && (
        <ul className="dn-catfix-review" aria-label="Rows that need a category">
          {review.map((r) => (
            <ReviewRow key={r.row} row={r} categories={categories} onImport={onImport} onSkip={onSkip} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewRow({ row, categories, onImport, onSkip }) {
  const [choice, setChoice] = useState(row.suggestedCategory || "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onImport(row, choice);
    } catch {
      setBusy(false); // onImport has already said what went wrong
    }
  };

  return (
    <li className="dn-catfix-row">
      <div className="dn-catfix-info">
        <strong>Row {row.row} · {row.item.name}</strong>
        <span>{row.message}</span>
      </div>
      <div className="dn-catfix-actions">
        <select
          className="dn-catfix-select"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={busy}
          aria-label={`Category for row ${row.row}`}
        >
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="button" className="dn-btn-ghost dn-catfix-btn" onClick={submit} disabled={!choice || busy}>
          {busy ? <Loader2 size={14} className="dn-spin" /> : <CheckCircle2 size={14} />} Import
        </button>
        <button type="button" className="dn-icon-btn" onClick={() => onSkip(row)} disabled={busy} aria-label={`Skip row ${row.row}`}>
          <X size={15} />
        </button>
      </div>
    </li>
  );
}

function PublishSwitch({ item, onToggle }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await onToggle(item);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!item.published}
      aria-label={`${item.published ? "Unpublish" : "Publish"} ${item.name}`}
      className={item.published ? "dn-switch on" : "dn-switch"}
      onClick={toggle}
      disabled={busy}
    >
      <span className="dn-switch-track"><span className="dn-switch-thumb" /></span>
      <span className="dn-switch-label">{item.published ? "Live" : "Hidden"}</span>
    </button>
  );
}

export default function MyDonations() {
  const { user } = useAuth();
  const toast = useToast();
  const [donations, setDonations] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [upload, setUpload] = useState(null); // { tone, text } | { busy: true }
  // Which row has its progress timeline expanded. One at a time - two open
  // timelines push the rows too far apart to scan.
  const [trackingId, setTrackingId] = useState(null);
  const [page, setPage] = useState(1);
  const fileRef = useRef(null);

  // A failed load falls back to an empty list so the skeleton never spins forever.
  const load = () =>
    api
      .get(`/donations?donorId=${user.id}`)
      .then((d) => setDonations(d.donations || []))
      .catch((err) => {
        toast.error(err.message);
        setDonations((prev) => prev || []);
      });

  useEffect(() => {
    load();
  }, [user.id]);

  const all = donations || [];
  const loading = donations === null;

  const counts = useMemo(() => {
    const c = { all: all.length };
    all.forEach((d) => { c[d.status] = (c[d.status] || 0) + 1; });
    return c;
  }, [all]);

  const stats = useMemo(() => ({
    published: all.filter((d) => d.published && d.status !== "expired" && d.status !== "collected").length,
    // One total per unit: kilograms, liters and packets don't add up together.
    live: UNITS.reduce((acc, u) => {
      acc[u.key] = all
        .filter((d) => d.status === "surplus" && unitOf(d).key === u.key)
        .reduce((s, d) => s + (Number(d.quantityKg) || 0), 0);
      return acc;
    }, {}),
  }), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sortDef = SORTS.find((s) => s.key === sort) || SORTS[0];
    return all
      .filter((d) => tab === "all" || d.status === tab)
      .filter((d) => !q || [d.name, d.category, d.batchNumber].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
      .sort(sortDef.cmp);
  }, [all, tab, query, sort]);

  // pageSafe clamps rather than the state itself, so deleting or filtering down
  // to fewer pages can never strand the list on an empty one.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // Changing what is listed starts a different list, so go back to its first
  // page, and drop any open timeline - its row may not be on screen now.
  const resetView = (fn) => (v) => {
    fn(v);
    setPage(1);
    setTrackingId(null);
  };

  const goToPage = (next) => {
    setPage(next);
    setTrackingId(null);
  };

  const togglePublish = async (item) => {
    try {
      await api.patch(`/donations/${item.id}`, { published: !item.published });
      toast.success(item.published ? `${item.name} is hidden from NGOs.` : `${item.name} is now live for NGOs.`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("donorId", user.id);
    setUpload({ busy: true, text: `Importing ${file.name}…` });
    try {
      const res = await api.upload("/donations/upload", fd);
      setUpload({
        tone: "ok",
        text: res.message,
        detail: `${res.surplusDetected} flagged as surplus · ${res.expiredDetected} expired`,
        corrections: res.categoryCorrections || [],
        review: res.reviewRequired || [],
        categories: res.categories || CATEGORIES,
      });
      load();
    } catch (err) {
      setUpload({ tone: "danger", text: err.message });
    }
    e.target.value = "";
  };

  const dropReviewRow = (row) =>
    setUpload((prev) => prev && { ...prev, review: prev.review.filter((r) => r.row !== row.row) });

  // Imports one held-back row with the category the donor chose. Rethrows so
  // the row stays on screen, with its controls usable again, if it fails.
  const importReviewRow = async (row, category) => {
    try {
      const res = await api.post("/donations/upload/confirm", {
        donorId: user.id,
        rows: [{ rowNumber: row.row, ...row.item, originalCategory: row.originalCategory, category }],
      });
      // No item back means it was still too fresh to list - the message says so.
      if (res.items?.length) toast.success(`${row.item.name} imported under ${category}.`);
      else toast.info(res.message);
      dropReviewRow(row);
      load();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const dash = (v) => (loading ? "—" : v);

  return (
    <>
      <div className="page-header dn-header">
        <div>
          <h1>My Donations</h1>
          <p>Upload inventory and publish surplus food. Review requests on the Food Requests page.</p>
        </div>
        <div className="dn-actions">
          <a href="/sample_inventory.csv" download="sample_inventory.csv" className="dn-btn-ghost" title="Download sample CSV" aria-label="Download sample CSV">
            <Download size={15} /> <span>Sample CSV</span>
          </a>
          <button type="button" className="dn-btn-ghost" onClick={() => fileRef.current?.click()} disabled={upload?.busy} aria-label="Upload CSV">
            {upload?.busy ? <Loader2 size={15} className="dn-spin" /> : <Upload size={15} />} <span>Upload CSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} hidden />
          <button type="button" className="btn btn-primary dn-btn-add" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add item
          </button>
        </div>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconDonations size={26} color="var(--primary)" />}
          label="Total listings"
          value={dash(counts.all || 0)}
          sub="Everything you've added"
        />
        <StatCard
          icon={<IconSparkle size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Surplus"
          value={dash(counts.surplus || 0)}
          sub={`${stats.published} live for NGOs`}
        />
        <StatCard
          icon={<IconWeight size={26} color="var(--primary)" />}
          label="Surplus in stock"
          value={dash(Math.round(stats.live.kg * 10) / 10)}
          unit="KG"
          sub={`${Math.round(stats.live.liters * 10) / 10} L · ${stats.live.items} items/packets`}
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Collected"
          value={dash(counts.collected || 0)}
          sub={`${counts.expired || 0} expired → farms`}
        />
      </Stagger>

      {upload && (
        <div
          className={`dn-banner dn-banner-${upload.busy ? "info" : upload.tone === "ok" && upload.review?.length ? "warn" : upload.tone}`}
          role="status"
        >
          <span className="dn-banner-icon">
            {upload.busy ? <Loader2 size={18} className="dn-spin" /> : upload.tone === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </span>
          <div className="dn-banner-text">
            <strong>{upload.text}</strong>
            {upload.detail && <span>{upload.detail}</span>}
            {!upload.busy && (
              <UploadCategoryReport
                corrections={upload.corrections}
                review={upload.review}
                categories={upload.categories || CATEGORIES}
                onImport={importReviewRow}
                onSkip={dropReviewRow}
              />
            )}
            {!upload.busy && (
              <small>
                Expected headers: <code>name,category,batchNumber,quantity,unit,packSize,packUnit,expiryDate</code> - unit is{" "}
                <code>kg</code>, <code>liters</code> or <code>items</code> (kg if left out); for items, packSize/packUnit give
                one packet's size in kg or liters. Pickup location comes
                from your profile, so a <code>pickupLocation</code> column is ignored.
              </small>
            )}
          </div>
          {!upload.busy && (
            <button type="button" className="dn-icon-btn" onClick={() => setUpload(null)} aria-label="Dismiss">
              <X size={15} />
            </button>
          )}
        </div>
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
                <span className="fr-count">{dash(counts[t.key] || 0)}</span>
              </button>
            ))}
          </div>
          <div className="fr-tools">
            <select className="fr-select" aria-label="Sort" value={sort} onChange={(e) => resetView(setSort)(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <label className="fr-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search product, category or batch"
                value={query}
                onChange={(e) => resetView(setQuery)(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="dn-list" role="table" aria-label="Your donations">
          <div className="dn-row dn-row-head" role="row">
            <span role="columnheader">Product</span>
            <span role="columnheader">Quantity</span>
            <span role="columnheader">Expiry</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Visibility</span>
            <span role="columnheader" className="dn-right">Progress</span>
          </div>

          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="dn-row dn-row-skel" aria-hidden="true">
                <span className="dn-skel dn-skel-wide" />
                <span className="dn-skel" />
                <span className="dn-skel" />
                <span className="dn-skel" />
                <span className="dn-skel" />
                <span className="dn-skel" />
              </div>
            ))}

          {!loading &&
            paged.map((d) => {
              const exp = expiryInfo(d);
              const open = trackingId === d.id;
              return (
                <div key={d.id} className={open ? "dn-item open" : "dn-item"}>
                  <div className="dn-row" role="row">
                    <div className="dn-product" role="cell">
                      <img src={imageFor(d.category)} alt="" loading="lazy" />
                      <div>
                        <strong>{d.name}</strong>
                        <span>
                          {d.category}
                          {d.batchNumber && <> · <code>{d.batchNumber}</code></>}
                        </span>
                      </div>
                    </div>
                    <div className="dn-qty" role="cell">
                      <Package size={14} />
                      <strong>{d.quantityKg}</strong> {unitOf(d).short}
                      {packText(d) && <small className="dn-pack-each">{packText(d)}</small>}
                    </div>
                    <div className="dn-expiry" role="cell">
                      <strong>{formatDate(d.expiryDate)}</strong>
                      <span className={`dn-tone-${exp.tone}`}>{exp.text}</span>
                    </div>
                    <div role="cell">
                      <span className={`dn-status dn-status-${d.status}`}>
                        <i />
                        {STATUS_LABEL[d.status] || d.status}
                      </span>
                    </div>
                    <div role="cell">
                      <PublishSwitch item={d} onToggle={togglePublish} />
                    </div>
                    <div role="cell" className="dn-right">
                      <button
                        type="button"
                        className={open ? "dn-track active" : "dn-track"}
                        onClick={() => setTrackingId((id) => (id === d.id ? null : d.id))}
                        aria-expanded={open}
                      >
                        Track <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="dn-timeline">
                      <DonationTimeline item={d} donorId={user.id} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="dn-empty">
            <div className="dn-empty-icon"><PackageOpen size={26} /></div>
            <strong>{all.length === 0 ? "No donations yet" : "Nothing here"}</strong>
            <p>
              {all.length === 0
                ? "Add your first item or upload a CSV of your inventory to get started."
                : query
                  ? `No items match “${query}”.`
                  : "No items in this category yet."}
            </p>
            {all.length === 0 && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Add item
              </button>
            )}
          </div>
        )}

        <div className="dn-foot">
          {!loading && filtered.length > 0 && (
            <span className="dn-foot-count">
              {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          )}
          <Pagination page={pageSafe} totalPages={totalPages} onChange={goToPage} />
        </div>
      </div>

      {showForm && <AddItemModal user={user} onCreated={load} onClose={() => setShowForm(false)} />}
    </>
  );
}
