import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { IconPackageBox, IconMapPin } from "../components/Icons.jsx";
import { Search, SlidersHorizontal, X, List, Map as MapIcon } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import FreshnessMeter, { freshnessOf } from "../components/FreshnessMeter.jsx";
import { SkeletonGrid } from "../components/Skeleton.jsx";
import { FadeIn, HoverLift } from "../components/motion/Motion.jsx";
import { useToast } from "../components/Toast.jsx";
import SuccessBurst from "../components/SuccessBurst.jsx";
import FoodMap from "../components/FoodMap.jsx";

const CATEGORY_IMAGE = {
  "Cooked Meals": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
  Vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80",
  Dairy: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&auto=format&fit=crop&q=80",
  Fruits: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
  "Packaged Goods": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=400&auto=format&fit=crop&q=80",
  Other: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=80",
};

function RequestModal({ item, user, onClose }) {
  const [quantityKg, setQuantityKg] = useState(Math.min(item.quantityKg, 10));
  const [urgency, setUrgency] = useState("medium");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/requests", {
        itemId: item.id,
        beneficiaryId: user.id,
        quantityKg: Number(quantityKg),
        urgency,
      });
      setDone(true);
      toast.success(`Request sent for ${quantityKg} kg of ${item.name}.`);
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
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <SuccessBurst
            title="Request submitted"
            message={`${quantityKg} kg of ${item.name}. The donor has been notified - you'll get a collection ticket once approved.`}
          >
            <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onClose}>
              Done
            </button>
          </SuccessBurst>
        ) : (
          <form onSubmit={submit} className={shake ? "shake" : undefined}>
            <h3 style={{ marginTop: 0 }}>Request: {item.name}</h3>
            <p style={{ fontSize: 12.5, color: "var(--text-light)", marginTop: -8 }}>
              {item.quantityKg} kg available · {item.pickupLocation}
            </p>
            <div className="form-row">
              <label>Quantity needed (kg)</label>
              <input type="number" max={item.quantityKg} min={1} value={quantityKg} onChange={(e) => setQuantityKg(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
                {busy ? "Submitting…" : "Submit Request"}
              </button>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LockedModal({ mode, onClose }) {
  const isGuest = mode === "guest";
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 380, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>{isGuest ? "🔒" : "⏳"}</div>
        {isGuest ? (
          <>
            <h3 style={{ marginTop: 0 }}>Login required</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-mid)" }}>
              Please log in or register as a verified Beneficiary/NGO to claim food donations.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Link to="/login" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Log in
              </Link>
              <Link to="/register" className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }}>
                Register
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Verification pending</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-mid)" }}>
              Your account is pending verification. Once approved by Admin, you can claim this item.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onClose}>
              Got it
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const EXPIRY_BANDS = [
  { key: "", label: "Any" },
  { key: "today", label: "Today", test: (d) => d <= 0 },
  { key: "1-3", label: "1-3 days", test: (d) => d >= 1 && d <= 3 },
  { key: "4-7", label: "4-7 days", test: (d) => d >= 4 && d <= 7 },
];

function FilterPanel({ categories, selected, onToggle, band, onBand, minKg, onMinKg, onReset, resultCount }) {
  return (
    <div className="card browse-filters">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
          <SlidersHorizontal size={15} color="var(--primary)" />
          Filter
        </h3>
        <button
          type="button"
          onClick={onReset}
          style={{ fontSize: 12, color: "var(--text-light)", background: "none", border: "none" }}
        >
          Reset
        </button>
      </div>

      <div className="filter-group">
        <span className="filter-legend">Food type</span>
        {categories.map((c) => (
          <label key={c} className="filter-row">
            <input type="checkbox" checked={selected.includes(c)} onChange={() => onToggle(c)} />
            <span>{c}</span>
          </label>
        ))}
        {categories.length === 0 && <p className="filter-empty">No categories available.</p>}
      </div>

      <div className="filter-group">
        <span className="filter-legend">Expires within</span>
        {EXPIRY_BANDS.map((b) => (
          <label key={b.key} className="filter-row">
            <input type="radio" name="expiry-band" checked={band === b.key} onChange={() => onBand(b.key)} />
            <span>{b.label}</span>
          </label>
        ))}
      </div>

      <div className="filter-group" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <span className="filter-legend">Minimum quantity</span>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={minKg}
          onChange={(e) => onMinKg(Number(e.target.value))}
          className="filter-range"
          aria-label="Minimum quantity in kilograms"
        />
        <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 4 }}>
          {minKg === 0 ? "Any quantity" : minKg + " kg or more"}
        </div>
      </div>

      <div className="filter-count">
        {resultCount} item{resultCount === 1 ? "" : "s"} match
      </div>
    </div>
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

  // Every filter runs client-side over the live list, so typing or ticking a
  // box re-renders instantly instead of waiting on a round trip.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bandDef = EXPIRY_BANDS.find((b) => b.key === band);
    return relevant.filter((i) => {
      if (q && ![i.name, i.category, i.pickupLocation].filter(Boolean).some((f) => f.toLowerCase().includes(q))) {
        return false;
      }
      if (cats.length && !cats.includes(i.category)) return false;
      if (bandDef && bandDef.test && !bandDef.test(Number(i.daysUntilExpiry))) return false;
      if (minKg > 0 && Number(i.quantityKg) < minKg) return false;
      return true;
    });
  }, [relevant, query, cats, band, minKg]);

  const toggleCat = (c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const reset = () => {
    setCats([]);
    setBand("");
    setMinKg(0);
    setQuery("");
  };
  const filtersActive = cats.length > 0 || band !== "" || minKg > 0 || query !== "";

  const handleAction = (item) => {
    if (!user) return setLocked("guest");
    if (!canRequest) return setLocked("pending");
    setSelected(item);
  };

  return (
    <>
      <div className="page-header">
        <h1>{isFarm ? "Expired Food for Compost / Feed" : "Available Surplus Food"}</h1>
        <p>
          {isFarm
            ? "Request expired items redirected for livestock feeding or composting."
            : "Browse near-expiry food published by donors and submit a request."}
        </p>
      </div>

      {!user && (
        <div className="banner" style={{ background: "var(--sand-light)" }}>
          <div>
            <strong>You are browsing as a guest</strong>
            <p>Anyone can view available surplus food. Log in or register as a verified Beneficiary/NGO to claim items.</p>
          </div>
        </div>
      )}

      {user && !user.verified && (user.role === "beneficiary" || user.role === "farm") && (
        <div className="banner" style={{ background: "var(--status-warn-bg)" }}>
          <div>
            <strong>Your organization is pending verification</strong>
            <p>You can browse listings, but requests require admin verification first.</p>
          </div>
        </div>
      )}

      <div className="browse-toolbar">
        <div className="browse-search">
          <Search
            size={16}
            color="var(--text-light)"
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, category or pickup location"
            aria-label="Search available food"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="browse-search-clear">
              <X size={14} color="var(--text-light)" />
            </button>
          )}
        </div>
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
          className="btn btn-outline btn-sm browse-filter-toggle"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          {filtersActive ? "Filters on" : "Filters"}
        </button>
      </div>

      <div className={showFilters ? "browse-layout filters-open" : "browse-layout"}>
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
          {view === "map" && !loading && (
            <FoodMap
              items={visible}
              onSelect={handleAction}
              actionLabel={!user ? "Request Food" : canRequest ? "Request This Item" : "Verification required"}
            />
          )}
          {view === "map" && loading && <div className="card empty-state">Loading map…</div>}

          <div className="browse-grid" hidden={view === "map"}>
            {loading && <SkeletonGrid count={6} />}

            {!loading &&
              visible.map((item) => {
                const f = freshnessOf(item);
                return (
                  <HoverLift className="card food-card" key={item.id}>
                    <div style={{ position: "relative" }}>
                      <img
                        src={CATEGORY_IMAGE[item.category] || CATEGORY_IMAGE.Other}
                        alt={item.category}
                        style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 10 }}
                      />
                      <span className="food-card-chip" style={{ background: f.tint, color: f.color }}>
                        {f.label}
                      </span>
                    </div>

                    <strong style={{ fontSize: 15 }}>{item.name}</strong>
                    <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "3px 0 10px" }}>{item.category}</p>

                    <FreshnessMeter item={item} />

                    <p style={{ fontSize: 13, margin: "10px 0 0", lineHeight: 1.9 }}>
                      <IconPackageBox size={14} color="var(--text-mid)" /> {item.quantityKg} kg available <br />
                      <IconMapPin size={14} color="var(--text-mid)" /> {item.pickupLocation}
                    </p>

                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                      onClick={() => handleAction(item)}
                    >
                      {!user ? "Request Food" : canRequest ? "Request This Item" : "Verification required"}
                    </button>
                  </HoverLift>
                );
              })}
          </div>

          {!loading && visible.length === 0 && view === "list" && (
            <FadeIn className="card empty-state">
              {relevant.length === 0
                ? "No listings available right now - check back soon."
                : "No items match your search and filters."}
              {relevant.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" onClick={reset}>
                    Clear filters
                  </button>
                </div>
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
