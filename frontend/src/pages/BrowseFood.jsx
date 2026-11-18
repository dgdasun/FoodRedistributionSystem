import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatQty, hasPackSize, packText, packTotal, unitOf } from "../units.js";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import {
  Search, SlidersHorizontal, X, List, Map as MapIcon, MapPin, Package, Store,
  Clock, ArrowRight, Lock, Hourglass, ShoppingBasket, Sparkles, ArrowUpDown, Minus, Plus, Eye, Check,
} from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import FreshnessMeter, { freshnessOf } from "../components/FreshnessMeter.jsx";
import { SkeletonGrid } from "../components/Skeleton.jsx";
import { FadeIn, HoverLift } from "../components/motion/Motion.jsx";
import { useToast } from "../components/Toast.jsx";
import SuccessBurst from "../components/SuccessBurst.jsx";
import FoodMap from "../components/FoodMap.jsx";
import { imageFor } from "../foodImages.js";
import "../styles/browse.css";

const URGENCIES = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

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
  // Requests are in the listing's own unit: kilograms, liters or packets.
  const u = unitOf(item).short;
  const isPackets = item.unit === "items";
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
        quantityKg: Number(quantityKg),
        urgency,
      });
      setDone(true);
      toast.success(`Request sent for ${quantityKg} ${u} of ${item.name}.`);
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
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {done ? (
          <div className="rq-body">
            <SuccessBurst
              title="Request submitted"
              message={`${quantityKg} ${u} of ${item.name}. The donor has been notified - you'll get a collection ticket once approved.`}
            >
              <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={onClose}>
                Done
              </button>
            </SuccessBurst>
          </div>
        ) : (
          <form onSubmit={submit} className={shake ? "shake" : undefined}>
            <div className="bf-modal-media">
              <img src={imageFor(item.category)} alt="" />
              <button type="button" className="bf-modal-close" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
              <div className="bf-modal-media-text">
                <span>{item.category}</span>
                <h3>{item.name}</h3>
              </div>
            </div>

            <div className="rq-body">
              <div className="bf-modal-facts">
                <div><Package size={15} /><span>Available</span><strong>{formatQty(item.quantityKg, item)}</strong></div>
                {hasPackSize(item) && (
                  <div><Package size={15} /><span>Each packet</span><strong>{packText(item).replace(/ each$/, "")}</strong></div>
                )}
                <div><Clock size={15} /><span>Expiry</span><strong>{expiryText(item)}</strong></div>
                <div><MapPin size={15} /><span>Pickup</span><strong title={item.pickupLocation}>{item.pickupLocation}</strong></div>
              </div>

              <div>
                <label className="bf-field-label bf-field-label-row" htmlFor="bf-qty">
                  <span>{isPackets ? "How many packets do you need?" : `How much do you need? (${u})`}</span>
                  <span>max {max} {u}</span>
                </label>
                <div className="bf-stepper">
                  <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <input
                    id="bf-qty"
                    type="number"
                    min={1}
                    max={max}
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value)}
                    onBlur={() => setQty(qty || 1)}
                    required
                  />
                  <button type="button" onClick={() => setQty(qty + 1)} disabled={qty >= max} aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
                {quickPicks.length > 1 && (
                  <div className="bf-quick">
                    {quickPicks.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={qty === v ? "bf-quick-btn active" : "bf-quick-btn"}
                        onClick={() => setQty(v)}
                      >
                        {v === max ? `All ${v} ${u}` : `${v} ${u}`}
                      </button>
                    ))}
                  </div>
                )}
                {hasPackSize(item) && qty > 0 && (
                  <p className="bf-pack-total">
                    {qty} packet{qty === 1 ? "" : "s"} × {packText(item)} = <strong>{packTotal(qty, item)}</strong> in total
                  </p>
                )}
              </div>

              <div>
                <span className="bf-field-label">Urgency</span>
                <div className="bf-segment" role="radiogroup" aria-label="Urgency">
                  {URGENCIES.map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      role="radio"
                      aria-checked={urgency === u.key}
                      className={`bf-segment-btn bf-urg-${u.key}${urgency === u.key ? " active" : ""}`}
                      onClick={() => setUrgency(u.key)}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="bf-error">{error}</p>}
            </div>

            <div className="rq-foot">
              <div className="rq-actions">
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LockedModal({ mode, expired, onClose }) {
  const isGuest = mode === "guest";
  useEscape(onClose);
  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal bf-locked" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="rq-body" style={{ alignItems: "center", textAlign: "center", padding: "30px 26px 24px" }}>
          <div className={isGuest ? "bf-locked-icon" : "bf-locked-icon bf-locked-icon-warn"}>
            {isGuest ? <Lock size={24} /> : <Hourglass size={24} />}
          </div>
          <h3>{isGuest ? "Log in to request food" : "Verification pending"}</h3>
          <p>
            {isGuest
              ? expired
                ? "Log in or register as a verified farm partner to claim expired food for feed or compost."
                : "Log in or register as a verified Beneficiary/NGO to claim food donations."
              : "Your account is pending verification. Once approved by Admin, you can claim this item."}
          </p>
          {isGuest ? (
            <div className="bf-locked-actions">
              <Link to="/login" className="btn btn-outline">Log in</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>Got it</button>
          )}
        </div>
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

const SORTS = [
  { key: "newest", label: "Newest first", cmp: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) },
  { key: "expiry", label: "Expiring soonest", cmp: (a, b) => Number(a.daysUntilExpiry) - Number(b.daysUntilExpiry) },
  { key: "qty", label: "Most quantity", cmp: (a, b) => Number(b.quantityKg) - Number(a.quantityKg) },
];

function expiryText(item) {
  const d = Number(item.daysUntilExpiry);
  if (!Number.isFinite(d)) return "-";
  if (d < 0) return "Past expiry";
  if (d === 0) return "Today";
  return `${d} day${d === 1 ? "" : "s"} left`;
}


function FilterPanel({ categories, counts, selected, onToggle, band, onBand, minKg, onMinKg, onReset, resultCount }) {
  return (
    <aside className="bf-filters">
      <div className="bf-filters-head">
        <h3>
          <SlidersHorizontal size={15} />
          Filters
        </h3>
        <button type="button" onClick={onReset} className="bf-link">
          Reset
        </button>
      </div>

      <div className="bf-filter-group">
        <span className="bf-legend">Food type</span>
        {categories.map((c) => (
          <label key={c} className={selected.includes(c) ? "bf-check active" : "bf-check"}>
            <input type="checkbox" checked={selected.includes(c)} onChange={() => onToggle(c)} />
            <img src={imageFor(c)} alt="" />
            <span className="bf-check-label">{c}</span>
            <span className="bf-check-count">{counts[c] || 0}</span>
          </label>
        ))}
        {categories.length === 0 && <p className="bf-muted">No categories available.</p>}
      </div>

      <div className="bf-filter-group">
        <span className="bf-legend">Expires within</span>
        <div className="bf-pills" role="radiogroup" aria-label="Expires within">
          {EXPIRY_BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              role="radio"
              aria-checked={band === b.key}
              className={band === b.key ? "bf-pill active" : "bf-pill"}
              onClick={() => onBand(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bf-filter-group">
        <div className="bf-range-head">
          <span className="bf-legend" style={{ margin: 0 }}>Minimum quantity</span>
          <span className="bf-range-value">{minKg === 0 ? "Any" : `${minKg}+ kg`}</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={minKg}
          onChange={(e) => onMinKg(Number(e.target.value))}
          className="bf-range"
          style={{ "--fill": `${(minKg / 50) * 100}%` }}
          aria-label="Minimum quantity in kilograms"
        />
        <div className="bf-range-scale"><span>0</span><span>25</span><span>50 kg</span></div>
      </div>

      <div className="bf-filter-count">
        <strong>{resultCount}</strong> item{resultCount === 1 ? "" : "s"} match
      </div>
    </aside>
  );
}

function FoodCard({ item, actionLabel, onAction, requested }) {
  const f = freshnessOf(item);
  return (
    <HoverLift className="bf-card" initial="hidden" animate="shown">
      <div className="bf-card-media">
        <img src={imageFor(item.category)} alt={item.category} loading="lazy" />
        <span className="bf-card-status" style={{ color: f.color, background: f.tint }}>
          <i style={{ background: f.color }} />
          {f.label}
        </span>
        <span className="bf-card-qty">
          <Package size={13} /> {formatQty(item.quantityKg, item)}
        </span>
      </div>

      <div className="bf-card-body">
        <div className="bf-card-meta">
          <span className="bf-card-category">{item.category}</span>
          {item.donorName && (
            <span className="bf-card-donor" title={item.donorName}>
              <Store size={12} /> {item.donorName}
            </span>
          )}
        </div>
        <h3 className="bf-card-title">{item.name}</h3>
        <p className="bf-card-location">
          <MapPin size={14} /> {item.pickupLocation}
        </p>
        {hasPackSize(item) && (
          <p className="bf-card-pack">
            <Package size={14} /> {packText(item)} · {packTotal(item.quantityKg, item)} in total
          </p>
        )}

        <div className="bf-card-meter">
          <FreshnessMeter item={item} />
        </div>

        {onAction && requested && (
          <button className="btn btn-outline bf-card-action" disabled>
            <Check size={15} />
            Already requested
          </button>
        )}
        {onAction && !requested && (
          <button className="btn btn-primary bf-card-action" onClick={() => onAction(item)}>
            {actionLabel}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </HoverLift>
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
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  // Map and list show the same filtered set - the toggle only changes how it
  // is drawn, never what is in it.
  const [view, setView] = useState("list");

  const isFarm = user?.role === "farm";
  // Admins oversee the marketplace but never claim food, so they get no request action.
  const isAdmin = user?.role === "admin";
  // Farms only ever see expired stock; admins and guests can look at either list,
  // picked with ?show=expired (the dashboard's "Expired, routed to farms" row links there).
  const [searchParams, setSearchParams] = useSearchParams();
  const showExpired = isFarm || ((isAdmin || !user) && searchParams.get("show") === "expired");
  const canRequest = !!user && (user.role === "beneficiary" || user.role === "farm") && !!user.verified;
  const actionLabel = !user ? "Request food" : canRequest ? "Request this item" : "Verification required";

  const { data, refresh } = useLiveData("/donations?published=true", { intervalMs: 20000 });
  const items = data?.donations;
  const loading = !data;

  // The backend allows one request per organization per item; mirror that here
  // so the button is already disabled instead of failing on submit.
  const { data: mine, refresh: refreshMine } = useLiveData(`/requests?beneficiaryId=${user?.id}`, {
    intervalMs: 20000,
    enabled: canRequest,
  });
  const requestedIds = useMemo(() => new Set((mine?.requests || []).map((r) => r.itemId)), [mine]);

  const inStock = useMemo(() => (items || []).filter((i) => Number(i.quantityKg) > 0), [items]);
  const expiredCount = useMemo(() => inStock.filter((i) => i.status === "expired").length, [inStock]);
  const relevant = useMemo(
    () => inStock.filter((i) => (showExpired ? i.status === "expired" : i.status !== "expired")),
    [inStock, showExpired]
  );

  const categories = useMemo(
    () => [...new Set(relevant.map((i) => i.category).filter(Boolean))].sort(),
    [relevant]
  );

  const counts = useMemo(() => {
    const m = {};
    relevant.forEach((i) => { m[i.category] = (m[i.category] || 0) + 1; });
    return m;
  }, [relevant]);

  const stats = useMemo(() => {
    const points = new Set(relevant.map((i) => i.pickupLocation).filter(Boolean)).size;
    return { listings: relevant.length, points };
  }, [relevant]);

  // Every filter runs client-side over the live list, so typing or ticking a
  // box re-renders instantly instead of waiting on a round trip.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bandDef = EXPIRY_BANDS.find((b) => b.key === band);
    const sortDef = SORTS.find((s) => s.key === sort) || SORTS[0];
    return relevant
      .filter((i) => {
        if (q && ![i.name, i.category, i.pickupLocation, i.donorName].filter(Boolean).some((f) => f.toLowerCase().includes(q))) {
          return false;
        }
        if (cats.length && !cats.includes(i.category)) return false;
        if (bandDef && bandDef.test && !bandDef.test(Number(i.daysUntilExpiry))) return false;
        if (minKg > 0 && Number(i.quantityKg) < minKg) return false;
        return true;
      })
      .sort(sortDef.cmp);
  }, [relevant, query, cats, band, minKg, sort]);

  const toggleCat = (c) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const reset = () => {
    setCats([]);
    setBand("");
    setMinKg(0);
    setQuery("");
  };
  const filtersActive = cats.length > 0 || band !== "" || minKg > 0 || query !== "";

  const activeTags = [
    ...(query ? [{ key: "q", label: `“${query}”`, clear: () => setQuery("") }] : []),
    ...cats.map((c) => ({ key: `c-${c}`, label: c, clear: () => toggleCat(c) })),
    ...(band ? [{ key: "band", label: `Expires: ${EXPIRY_BANDS.find((b) => b.key === band)?.label}`, clear: () => setBand("") }] : []),
    ...(minKg > 0 ? [{ key: "kg", label: `${minKg}+ kg`, clear: () => setMinKg(0) }] : []),
  ];

  const handleAction = (item) => {
    if (!user) return setLocked("guest");
    if (!canRequest) return setLocked("pending");
    if (requestedIds.has(item.id)) return;
    setSelected(item);
  };

  return (
    <div className="bf-page">
      <section className="bf-hero">
        <svg className="bf-hero-art" viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <circle cx="520" cy="40" r="120" />
          <circle cx="430" cy="230" r="70" />
          <circle cx="600" cy="200" r="50" />
        </svg>

        <div className="bf-hero-top">
          <div>
            <span className="bf-eyebrow">
              <Sparkles size={13} /> {showExpired ? "Compost & feed" : "Live surplus marketplace"}
            </span>
            <h1>{showExpired ? "Expired Food for Compost / Feed" : "Available Surplus Food"}</h1>
            <p>
              {showExpired
                ? isAdmin
                  ? "Expired items redirected to farms for livestock feeding or composting."
                  : "Request expired items redirected for livestock feeding or composting."
                : isAdmin
                  ? "Near-expiry food published by donors and open to beneficiary requests."
                  : "Browse near-expiry food published by donors and submit a request before it goes to waste."}
            </p>
          </div>

          <div className="bf-stats">
            <div><strong>{loading ? "–" : stats.listings}</strong><span>Listings</span></div>
            <div><strong>{loading ? "–" : stats.points}</strong><span>Pickup points</span></div>
          </div>
        </div>

        <div className="bf-searchbar">
          <div className="bf-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food, category, donor or pickup location"
              aria-label="Search available food"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="bf-search-clear">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="bf-view" role="group" aria-label="Result view">
            <button
              type="button"
              className={view === "list" ? "active" : undefined}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <List size={15} /> List
            </button>
            <button
              type="button"
              className={view === "map" ? "active" : undefined}
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
            >
              <MapIcon size={15} /> Map
            </button>
          </div>
        </div>
      </section>

      {!user && (
        <div className="bf-notice">
          <div className="bf-notice-icon"><Lock size={17} /></div>
          <div className="bf-notice-text">
            <strong>You are browsing as a guest</strong>
            <p>
              {showExpired
                ? "Anyone can view expired food set aside for feed or compost. Log in or register as a verified farm partner to claim items."
                : "Anyone can view available surplus food. Log in or register as a verified Beneficiary/NGO to claim items."}
            </p>
          </div>
          <div className="bf-notice-actions">
            <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </div>
        </div>
      )}

      {!user && (
        <div className="bf-view bf-kind" role="tablist" aria-label="Food type">
          {[
            { expired: false, label: "Surplus food", count: inStock.length - expiredCount },
            { expired: true, label: "Expired food", count: expiredCount },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={showExpired === t.expired}
              className={showExpired === t.expired ? "active" : undefined}
              onClick={() => {
                reset();
                setSearchParams(t.expired ? { show: "expired" } : {});
              }}
            >
              {t.expired ? <Hourglass size={15} /> : <ShoppingBasket size={15} />}
              {t.label}
              <span className="bf-kind-count">{loading ? "–" : t.count}</span>
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="bf-notice">
          <div className="bf-notice-icon"><Eye size={17} /></div>
          <div className="bf-notice-text">
            <strong>Admin view (read-only)</strong>
            <p>
              {showExpired
                ? "These listings have expired and are offered to farms for feed or compost."
                : "These are the surplus listings currently live for beneficiaries. Requests are made by verified organizations."}
            </p>
          </div>
          <div className="bf-notice-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                reset();
                setSearchParams(showExpired ? {} : { show: "expired" });
              }}
            >
              {showExpired ? "View surplus food" : "View expired food"}
            </button>
            <Link to="/dashboard" className="btn btn-outline btn-sm">Back to dashboard</Link>
          </div>
        </div>
      )}

      {user && !user.verified && (user.role === "beneficiary" || user.role === "farm") && (
        <div className="bf-notice bf-notice-warn">
          <div className="bf-notice-icon"><Hourglass size={17} /></div>
          <div className="bf-notice-text">
            <strong>Your organization is pending verification</strong>
            <p>You can browse listings, but requests require admin verification first.</p>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="bf-chips" role="group" aria-label="Filter by food type">
          <button
            type="button"
            className={cats.length === 0 ? "bf-chip active" : "bf-chip"}
            onClick={() => setCats([])}
            aria-pressed={cats.length === 0}
          >
            <span className="bf-chip-icon"><ShoppingBasket size={15} /></span>
            All food
            <span className="bf-chip-count">{relevant.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={cats.includes(c) ? "bf-chip active" : "bf-chip"}
              onClick={() => toggleCat(c)}
              aria-pressed={cats.includes(c)}
            >
              <img src={imageFor(c)} alt="" />
              {c}
              <span className="bf-chip-count">{counts[c]}</span>
            </button>
          ))}
        </div>
      )}

      <div className={showFilters ? "bf-layout filters-open" : "bf-layout"}>
        <FilterPanel
          categories={categories}
          counts={counts}
          selected={cats}
          onToggle={toggleCat}
          band={band}
          onBand={setBand}
          minKg={minKg}
          onMinKg={setMinKg}
          onReset={reset}
          resultCount={visible.length}
        />

        <div className="bf-results">
          <div className="bf-results-bar">
            <div className="bf-results-count">
              {loading ? "Loading listings…" : (
                <>
                  Showing <strong>{visible.length}</strong> of {relevant.length} item{relevant.length === 1 ? "" : "s"}
                </>
              )}
            </div>
            <div className="bf-results-tools">
              <button
                type="button"
                className={filtersActive ? "bf-filter-toggle on" : "bf-filter-toggle"}
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={14} />
                Filters{filtersActive ? ` (${activeTags.length})` : ""}
              </button>
              <label className="bf-sort">
                <ArrowUpDown size={14} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings">
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {activeTags.length > 0 && (
            <div className="bf-tags">
              {activeTags.map((t) => (
                <button key={t.key} type="button" className="bf-tag" onClick={t.clear} aria-label={`Remove filter ${t.label}`}>
                  {t.label} <X size={12} />
                </button>
              ))}
              <button type="button" className="bf-link" onClick={reset}>Clear all</button>
            </div>
          )}

          {view === "map" && !loading && (
            <div className="bf-map">
              <FoodMap items={visible} onSelect={isAdmin ? undefined : handleAction} actionLabel={actionLabel} />
            </div>
          )}
          {view === "map" && loading && <div className="bf-empty">Loading map…</div>}

          <div className="bf-grid" hidden={view === "map"}>
            {loading && <SkeletonGrid count={6} />}
            {!loading &&
              visible.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  actionLabel={actionLabel}
                  onAction={isAdmin ? null : handleAction}
                  requested={requestedIds.has(item.id)}
                />
              ))}
          </div>

          {!loading && visible.length === 0 && view === "list" && (
            <FadeIn className="bf-empty">
              <div className="bf-empty-icon"><ShoppingBasket size={26} /></div>
              <strong>
                {relevant.length === 0 ? "No listings right now" : "No matches"}
              </strong>
              <p>
                {relevant.length === 0
                  ? "Donors publish new surplus throughout the day - check back soon."
                  : "No items match your search and filters. Try widening them."}
              </p>
              {relevant.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={reset}>
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
            refreshMine();
          }}
        />
      )}
      {locked && <LockedModal mode={locked} expired={showExpired} onClose={() => setLocked(null)} />}
    </div>
  );
}
