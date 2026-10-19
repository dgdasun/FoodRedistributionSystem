import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import {
  Search,
  SlidersHorizontal,
  X,
  List,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  Lock,
  Hourglass,
  Info,
  Package,
  Sparkles,
} from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import FreshnessMeter, { freshnessOf } from "../components/FreshnessMeter.jsx";
import { SkeletonGrid } from "../components/Skeleton.jsx";
import { FadeIn, HoverLift } from "../components/motion/Motion.jsx";
import { useToast } from "../components/Toast.jsx";
import SuccessBurst from "../components/SuccessBurst.jsx";
import FoodMap from "../components/FoodMap.jsx";
import { imageFor } from "../foodImages.js";

const URGENCIES = ["critical", "high", "medium", "low"];

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function RequestModal({ item, user, onClose }) {
  const max = Number(item.quantityKg) || 1;
  const [quantityKg, setQuantityKg] = useState(Math.min(max, 10));
  const [urgency, setUrgency] = useState("medium");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEscape(onClose);

  const qty = Number(quantityKg);
  const setQty = (v) => setQuantityKg(Math.max(1, Math.min(max, v)));
  // Quick picks scale with what is on offer, so a 4 kg listing doesn't offer "10 kg".
  const quickPicks = [...new Set([Math.round(max / 4), Math.round(max / 2), max].filter((v) => v >= 1))];

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/requests", {
        itemId: item.id,
        beneficiaryId: user.id,
        quantityKg: qty,
        urgency,
      });
      setDone(true);
      toast.success(`Request sent for ${qty} kg of ${item.name}.`);
    } catch (e2) {
      setError(e2.message);
      toast.error(e2.message);
      // Shake is a second cue on top of the written error, never instead of it.
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bx-modal-backdrop" onClick={onClose}>
      <div
        className="bx-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Request ${item.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="bx-modal-center">
            <SuccessBurst
              title="Request submitted"
              message={`${qty} kg of ${item.name}. The donor has been notified - you'll get a collection ticket once approved.`}
            >
              <button className="bx-btn primary" style={{ marginTop: 6 }} onClick={onClose}>
                Done
              </button>
            </SuccessBurst>
          </div>
        ) : (
          <>
            <div className="bx-modal-media">
              <img src={imageFor(item.category)} alt="" />
              <button type="button" className="bx-modal-close" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
              <div className="bx-modal-media-text">
                <small>{item.category}</small>
                <h3>{item.name}</h3>
              </div>
            </div>

            <form onSubmit={submit} className={`bx-modal-body${shake ? " shake" : ""}`}>
              <div className="bx-modal-meta">
                <span>
                  <Package size={14} /> {item.quantityKg} kg available
                </span>
                <span>
                  <MapPin size={14} /> {item.pickupLocation}
                </span>
              </div>

              <div className="bx-field">
                <div className="bx-field-label">
                  <span>How much do you need?</span>
                  <span>max {max} kg</span>
                </div>
                <div className="bx-stepper">
                  <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={max}
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value)}
                    onBlur={() => setQty(qty || 1)}
                    aria-label="Quantity in kilograms"
                    required
                  />
                  <button type="button" onClick={() => setQty(qty + 1)} disabled={qty >= max} aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
                {quickPicks.length > 1 && (
                  <div className="bx-quick">
                    {quickPicks.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={qty === v ? "bx-toggle active" : "bx-toggle"}
                        onClick={() => setQty(v)}
                      >
                        {v === max ? `All ${v} kg` : `${v} kg`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bx-field">
                <div className="bx-field-label">
                  <span>Urgency</span>
                </div>
                <div className="bx-urgency" role="radiogroup" aria-label="Urgency">
                  {URGENCIES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      role="radio"
                      aria-checked={urgency === u}
                      className={urgency === u ? `active ${u}` : u}
                      onClick={() => setUrgency(u)}
                    >
                      <span className="bx-dot" />
                      {u[0].toUpperCase() + u.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="bx-form-error">{error}</p>}

              <div className="bx-modal-actions">
                <button type="button" className="bx-btn outline" onClick={onClose}>
                  Cancel
                </button>
                <button className="bx-btn primary" disabled={busy}>
                  {busy ? "Submitting…" : `Request ${qty || 0} kg`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function LockedModal({ mode, onClose }) {
  const isGuest = mode === "guest";
  useEscape(onClose);
  return (
    <div className="bx-modal-backdrop" onClick={onClose}>
      <div className="bx-modal" role="dialog" aria-modal="true" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="bx-modal-center">
          <div className="bx-empty-icon">{isGuest ? <Lock size={26} /> : <Hourglass size={26} />}</div>
          {isGuest ? (
            <>
              <h3 style={{ margin: "0 0 6px" }}>Login required</h3>
              <p>Please log in or register as a verified Beneficiary/NGO to claim food donations.</p>
              <div className="bx-modal-actions">
                <Link to="/login" className="bx-btn primary">
                  Log in
                </Link>
                <Link to="/register" className="bx-btn outline">
                  Register
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ margin: "0 0 6px" }}>Verification pending</h3>
              <p>Your account is pending verification. Once approved by Admin, you can claim this item.</p>
              <button className="bx-btn primary block" onClick={onClose}>
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const EXPIRY_BANDS = [
  { key: "", label: "Any time" },
  { key: "today", label: "Today", test: (d) => d <= 0 },
  { key: "1-3", label: "1-3 days", test: (d) => d >= 1 && d <= 3 },
  { key: "4-7", label: "4-7 days", test: (d) => d >= 4 && d <= 7 },
];

const SORTS = {
  expiry: { label: "Expiring soonest", fn: (a, b) => Number(a.daysUntilExpiry) - Number(b.daysUntilExpiry) },
  qty: { label: "Largest quantity", fn: (a, b) => Number(b.quantityKg) - Number(a.quantityKg) },
  name: { label: "Name A-Z", fn: (a, b) => String(a.name).localeCompare(String(b.name)) },
};

function FilterPanel({ categories, selected, onToggle, band, onBand, minKg, onMinKg, onReset, resultCount }) {
  return (
    <aside className="bx-filters" aria-label="Filters">
      <div className="bx-filters-head">
        <h3>
          <SlidersHorizontal size={16} color="var(--primary)" />
          Filters
        </h3>
        <button type="button" className="bx-btn link" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="bx-filter-section">
        <div className="bx-filter-label">
          <span>Food type</span>
          {selected.length > 0 && <span>{selected.length} selected</span>}
        </div>
        <div className="bx-toggle-grid">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={selected.includes(c) ? "bx-toggle active" : "bx-toggle"}
              aria-pressed={selected.includes(c)}
              onClick={() => onToggle(c)}
            >
              {c}
            </button>
          ))}
          {categories.length === 0 && <span className="filter-empty">No categories available.</span>}
        </div>
      </div>

      <div className="bx-filter-section">
        <div className="bx-filter-label">
          <span>Expires within</span>
        </div>
        <div className="bx-toggle-grid" role="radiogroup" aria-label="Expires within">
          {EXPIRY_BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              role="radio"
              aria-checked={band === b.key}
              className={band === b.key ? "bx-toggle active" : "bx-toggle"}
              onClick={() => onBand(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bx-filter-section">
        <div className="bx-filter-label">
          <span>Minimum quantity</span>
          <span>{minKg === 0 ? "Any" : `${minKg}+ kg`}</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={minKg}
          onChange={(e) => onMinKg(Number(e.target.value))}
          className="bx-range"
          aria-label="Minimum quantity in kilograms"
        />
        <div className="bx-range-scale">
          <span>0</span>
          <span>25</span>
          <span>50 kg</span>
        </div>
      </div>

      <div className="bx-filter-foot">
        <strong>{resultCount}</strong> item{resultCount === 1 ? "" : "s"} match
      </div>
    </aside>
  );
}

export default function BrowseFood() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(null); // "guest" | "pending"
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState([]);
  const [band, setBand] = useState("");
  const [minKg, setMinKg] = useState(0);
  const [sort, setSort] = useState("expiry");
  const [showFilters, setShowFilters] = useState(false);
  // Map and list show the same filtered set - the toggle only changes how it
  // is drawn, never what is in it.
  const [view, setView] = useState("list");

  const isFarm = user?.role === "farm";
  const canRequest = !!user && (user.role === "beneficiary" || user.role === "farm") && !!user.verified;

  const { data, refresh } = useLiveData("/donations?published=true", { intervalMs: 20000 });
  const items = data?.donations;
  const loading = !data;

  const relevant = useMemo(
    () => (items || []).filter((i) => (isFarm ? i.status === "expired" : i.status !== "expired")),
    [items, isFarm]
  );

  const categories = useMemo(
    () => [...new Set(relevant.map((i) => i.category).filter(Boolean))].sort(),
    [relevant]
  );

  const countByCat = useMemo(() => {
    const m = {};
    relevant.forEach((i) => (m[i.category] = (m[i.category] || 0) + 1));
    return m;
  }, [relevant]);

  const summary = useMemo(() => {
    const kg = relevant.reduce((s, i) => s + (Number(i.quantityKg) || 0), 0);
    const urgent = relevant.filter((i) => freshnessOf(i).key === "urgent").length;
    return { count: relevant.length, kg: Math.round(kg * 10) / 10, urgent };
  }, [relevant]);

  // Every filter runs client-side over the live list, so typing or ticking a
  // box re-renders instantly instead of waiting on a round trip.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bandDef = EXPIRY_BANDS.find((b) => b.key === band);
    return relevant
      .filter((i) => {
        if (q && ![i.name, i.category, i.pickupLocation].filter(Boolean).some((f) => f.toLowerCase().includes(q))) {
          return false;
        }
        if (cats.length && !cats.includes(i.category)) return false;
        if (bandDef && bandDef.test && !bandDef.test(Number(i.daysUntilExpiry))) return false;
        if (minKg > 0 && Number(i.quantityKg) < minKg) return false;
        return true;
      })
      .sort(SORTS[sort].fn);
  }, [relevant, query, cats, band, minKg, sort]);

  const toggleCat = (c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const reset = () => {
    setCats([]);
    setBand("");
    setMinKg(0);
    setQuery("");
  };
  const filtersActive = cats.length > 0 || band !== "" || minKg > 0 || query !== "";
  const bandLabel = EXPIRY_BANDS.find((b) => b.key === band)?.label;

  const handleAction = (item) => {
    if (!user) return setLocked("guest");
    if (!canRequest) return setLocked("pending");
    setSelected(item);
  };
  const actionLabel = !user ? "Request Food" : canRequest ? "Request This Item" : "Verification required";

  return (
    <>
      <section className="bx-hero">
        <div className="bx-hero-text">
          <span className="bx-eyebrow">
            <Sparkles size={13} /> {isFarm ? "Compost & feed" : "Live listings"}
          </span>
          <h1>{isFarm ? "Expired Food for Compost / Feed" : "Available Surplus Food"}</h1>
          <p>
            {isFarm
              ? "Request expired items redirected for livestock feeding or composting."
              : "Browse near-expiry food published by donors near you and request what your community needs."}
          </p>
        </div>
        <div className="bx-stats">
          <div className="bx-stat">
            <span className="bx-stat-value">{loading ? "–" : summary.count}</span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--primary)" }} /> Listings
            </span>
          </div>
          <div className="bx-stat">
            <span className="bx-stat-value">
              {loading ? "–" : summary.kg}
              <small>kg</small>
            </span>
            <span className="bx-stat-label">
              <span className="bx-dot" style={{ background: "var(--status-info-fg)" }} /> Available
            </span>
          </div>
          {!isFarm && (
            <div className="bx-stat">
              <span className="bx-stat-value">{loading ? "–" : summary.urgent}</span>
              <span className="bx-stat-label">
                <span className="bx-dot" style={{ background: "var(--warning)" }} /> Expiring soon
              </span>
            </div>
          )}
        </div>
      </section>

      {!user && (
        <div className="bx-notice info">
          <Info size={18} color="var(--primary)" />
          <div>
            <strong>You are browsing as a guest</strong>
            Anyone can view available surplus food. Log in or register as a verified Beneficiary/NGO to claim items.
          </div>
        </div>
      )}

      {user && !user.verified && (user.role === "beneficiary" || user.role === "farm") && (
        <div className="bx-notice warn">
          <Hourglass size={18} color="var(--status-warn-fg)" />
          <div>
            <strong>Your organization is pending verification</strong>
            You can browse listings, but requests require admin verification first.
          </div>
        </div>
      )}

      <div className="bx-toolbar">
        <div className="bx-search">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, category or pickup location"
            aria-label="Search available food"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="bx-search-clear">
              <X size={13} />
            </button>
          )}
        </div>
        <select className="bx-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings">
          {Object.entries(SORTS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="view-switch" role="group" aria-label="Result view">
          <button
            type="button"
            className={view === "list" ? "active" : undefined}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List size={14} /> List
          </button>
          <button
            type="button"
            className={view === "map" ? "active" : undefined}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            <MapIcon size={14} /> Map
          </button>
        </div>
        <button
          type="button"
          className="bx-btn outline bx-filter-toggle"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={14} />
          {filtersActive ? "Filters on" : "Filters"}
        </button>
      </div>

      {categories.length > 0 && (
        <div className="bx-chips" role="group" aria-label="Filter by food type">
          <button
            type="button"
            className={cats.length === 0 ? "bx-chip text-only active" : "bx-chip text-only"}
            onClick={() => setCats([])}
            aria-pressed={cats.length === 0}
          >
            All food <span className="bx-chip-count">{relevant.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={cats.includes(c) ? "bx-chip active" : "bx-chip"}
              onClick={() => toggleCat(c)}
              aria-pressed={cats.includes(c)}
            >
              <img src={imageFor(c)} alt="" />
              {c}
              <span className="bx-chip-count">{countByCat[c]}</span>
            </button>
          ))}
        </div>
      )}

      {filtersActive && (
        <div className="bx-active-filters">
          <span>
            Showing <strong>{visible.length}</strong> of {relevant.length}
          </span>
          {query && (
            <button type="button" className="bx-pill-x" onClick={() => setQuery("")}>
              “{query}” <X size={12} />
            </button>
          )}
          {cats.map((c) => (
            <button key={c} type="button" className="bx-pill-x" onClick={() => toggleCat(c)}>
              {c} <X size={12} />
            </button>
          ))}
          {band && (
            <button type="button" className="bx-pill-x" onClick={() => setBand("")}>
              {bandLabel} <X size={12} />
            </button>
          )}
          {minKg > 0 && (
            <button type="button" className="bx-pill-x" onClick={() => setMinKg(0)}>
              {minKg}+ kg <X size={12} />
            </button>
          )}
          <button type="button" className="bx-btn link" onClick={reset}>
            Clear all
          </button>
        </div>
      )}

      <div className={showFilters ? "bx-browse filters-open" : "bx-browse"}>
        <FilterPanel
          categories={categories}
          selected={cats}
          onToggle={toggleCat}
          band={band}
          onBand={setBand}
          minKg={minKg}
          onMinKg={setMinKg}
          onReset={reset}
          resultCount={visible.length}
        />

        <div>
          {view === "map" && !loading && <FoodMap items={visible} onSelect={handleAction} actionLabel={actionLabel} />}
          {view === "map" && loading && <div className="bx-empty">Loading map…</div>}

          <div className="bx-grid" hidden={view === "map"}>
            {loading && <SkeletonGrid count={6} />}

            {!loading &&
              visible.map((item) => {
                const f = freshnessOf(item);
                return (
                  <HoverLift className="bx-food" key={item.id}>
                    <div className="bx-food-media">
                      <img src={imageFor(item.category)} alt={item.category} loading="lazy" />
                      <span className="bx-badge bx-food-tag" style={{ background: f.tint, color: f.color }}>
                        {f.label}
                      </span>
                      <span className="bx-food-qty">
                        <strong>{item.quantityKg}</strong>
                        <span>kg</span>
                      </span>
                    </div>

                    <div className="bx-food-body">
                      <span className="bx-food-cat">{item.category}</span>
                      <strong className="bx-food-title">{item.name}</strong>
                      <p className="bx-food-loc">
                        <MapPin size={14} /> {item.pickupLocation}
                      </p>

                      <div className="bx-food-meter">
                        <FreshnessMeter item={item} />
                      </div>

                      <button
                        className={canRequest || !user ? "bx-btn primary block" : "bx-btn ghost block"}
                        onClick={() => handleAction(item)}
                      >
                        {!user || !canRequest ? <Lock size={14} /> : null}
                        {actionLabel}
                      </button>
                    </div>
                  </HoverLift>
                );
              })}
          </div>

          {!loading && visible.length === 0 && view === "list" && (
            <FadeIn className="bx-empty">
              <div className="bx-empty-icon">
                <Search size={26} />
              </div>
              <h3>{relevant.length === 0 ? "No listings right now" : "Nothing matches"}</h3>
              <p>
                {relevant.length === 0
                  ? "Donors publish new surplus throughout the day - check back soon."
                  : "Try a different search or loosen your filters."}
              </p>
              {relevant.length > 0 && (
                <button className="bx-btn outline" onClick={reset}>
                  Clear filters
                </button>
              )}
            </FadeIn>
          )}
        </div>
      </div>

      {selected && (
        <RequestModal
          item={selected}
          user={user}
          onClose={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
      {locked && <LockedModal mode={locked} onClose={() => setLocked(null)} />}
    </>
  );
}
