import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, MapPin, Users, Warehouse, Scale, Sparkles, Check, X, ChevronDown, Crown } from "lucide-react";

/**
 * Explainable AI recommendations.
 *
 * The AI service scores each pending request on five factors (urgency,
 * distance, organisation size, handling capacity, fairness) and now returns
 * that breakdown with the score. Everything here is derived from those real
 * numbers - no reason is shown that the model did not actually weigh.
 */

export const FACTORS = [
  { key: "urgency", label: "Urgency", Icon: AlertTriangle },
  { key: "distance", label: "Proximity", Icon: MapPin },
  { key: "orgSize", label: "People served", Icon: Users },
  { key: "capacity", label: "Handling capacity", Icon: Warehouse },
  { key: "fairness", label: "Fair share", Icon: Scale },
];

const hasFactors = (entry) => entry && entry.factors && Object.keys(entry.factors).length > 0;

/** Plain-language reason for one factor, phrased from the request's own values. */
function reasonFor(key, entry) {
  switch (key) {
    case "urgency":
      return `${capitalize(entry.urgency || "medium")} urgency`;
    case "distance":
      return entry.distanceKm ? `Only ${round1(entry.distanceKm)} km away` : "Close to pickup";
    case "orgSize":
      return "Serves many people";
    case "capacity":
      return "Can handle the quantity";
    case "fairness":
      return "Few recent allocations";
    default:
      return null;
  }
}

/** The factors that added the most to this score, strongest first. */
export function topReasons(entry, count = 2) {
  if (!hasFactors(entry)) return [];
  const weights = entry.weights || {};
  return FACTORS.map((f) => ({ ...f, contribution: (entry.factors[f.key] ?? 0) * (weights[f.key] ?? 0) }))
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, count)
    .map((f) => reasonFor(f.key, entry));
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const round1 = (n) => Math.round(n * 10) / 10;
export const matchPercent = (score) => Math.round((score || 0) * 100);

/** Circular match score. */
export function ScoreRing({ score, size = 64, stroke = 6, label = true }) {
  const reduce = useReducedMotion();
  const pct = matchPercent(score);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ai-ring" style={{ width: size, height: size }} aria-label={`${pct}% match`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary-light)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--primary)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c - (pct / 100) * c : c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label && (
        <span className="ai-ring-label" style={{ fontSize: size * 0.24 }}>
          {pct}
          <small>%</small>
        </span>
      )}
    </div>
  );
}

/** One bar per factor; the bar is the 0-1 factor score, the caption its model weight. */
export function FactorBars({ entry, compact = false }) {
  const reduce = useReducedMotion();
  if (!hasFactors(entry)) return null;
  return (
    <div className={compact ? "ai-factors ai-factors-compact" : "ai-factors"}>
      {FACTORS.map(({ key, label, Icon }, i) => {
        const value = entry.factors[key] ?? 0;
        const weight = entry.weights?.[key];
        return (
          <div className="ai-factor" key={key}>
            <div className="ai-factor-head">
              <span className="ai-factor-label">
                <Icon size={13} /> {label}
              </span>
              <span className="ai-factor-value">
                {Math.round(value * 100)}
                {weight != null && <em> · {Math.round(weight * 100)}% weight</em>}
              </span>
            </div>
            <div className="ai-factor-track">
              <motion.div
                className="ai-factor-fill"
                initial={{ width: reduce ? `${value * 100}%` : 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequestChips({ entry }) {
  return (
    <div className="ai-chips">
      {entry.urgency && <span className={`ai-chip ai-chip-${entry.urgency}`}>{capitalize(entry.urgency)}</span>}
      {entry.quantityKg > 0 && <span className="ai-chip">{round1(entry.quantityKg)} kg</span>}
      {entry.distanceKm > 0 && (
        <span className="ai-chip">
          <MapPin size={11} /> {round1(entry.distanceKm)} km
        </span>
      )}
    </div>
  );
}

/** Opens the request's detail popup, where the donor accepts (in full or partly) or declines. */
function Actions({ entry, onView, size = "sm" }) {
  return (
    <div className="ai-actions">
      <button className={`btn btn-primary btn-${size}`} onClick={() => onView(entry.requestId)}>
        <Check size={14} /> View & Accept
      </button>
    </div>
  );
}

/**
 * Ranked recommendations for one listed item: a highlighted top pick with its
 * full factor breakdown, then the remaining requests as expandable rows.
 */
export function AIRecommendationPanel({ itemName, ranking, onView, onClose }) {
  const [openId, setOpenId] = useState(null);

  const loading = ranking === null;
  const [top, ...rest] = ranking || [];
  const explained = hasFactors(top);

  return (
    <motion.section
      className="ai-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="ai-panel-head">
        <div className="ai-panel-title">
          <span className="ai-panel-badge">
            <Sparkles size={14} /> AI Match
          </span>
          <h3>Who should receive {itemName ? <em>{itemName}</em> : "this item"}?</h3>
          <p>Pending requests ranked by urgency, proximity, people served, capacity and fair share.</p>
        </div>
        <button type="button" className="ai-panel-close" onClick={onClose} aria-label="Close recommendations">
          <X size={18} />
        </button>
      </header>

      <div className="ai-panel-body">
        {loading && (
          <div className="ai-loading">
            <span className="ai-loading-orb" />
            <div>
              <strong>Analyzing requests…</strong>
              <span>Scoring every pending request on five factors.</span>
            </div>
          </div>
        )}

        {!loading && ranking.length === 0 && (
          <div className="ai-empty">
            <Sparkles size={22} />
            <strong>No pending requests yet</strong>
            <span>Recommendations appear as soon as beneficiaries request this item.</span>
          </div>
        )}

        {!loading && top && (
          <>
            {!explained && (
              <div className="ai-offline">
                The AI service is unavailable, so requests are listed in the order they arrived.
              </div>
            )}

            <div className="ai-top">
              <div className="ai-top-main">
                <div className="ai-top-ring">
                  <ScoreRing score={top.score} size={92} stroke={8} />
                  <span className="ai-top-crown">
                    <Crown size={13} /> Top pick
                  </span>
                </div>
                <div className="ai-top-info">
                  <strong>{top.beneficiaryName}</strong>
                  <RequestChips entry={top} />
                  {explained && (
                    <ul className="ai-reasons">
                      {topReasons(top, 3).map((r) => (
                        <li key={r}>
                          <Check size={13} /> {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Actions entry={top} onView={onView} size="md" />
                </div>
              </div>
              {explained && (
                <div className="ai-top-factors">
                  <span className="ai-section-label">Why this match</span>
                  <FactorBars entry={top} />
                </div>
              )}
            </div>

            {rest.length > 0 && (
              <div className="ai-rest">
                <span className="ai-section-label">Other requests</span>
                {rest.map((entry, i) => {
                  const open = openId === entry.requestId;
                  return (
                    <div className={open ? "ai-row open" : "ai-row"} key={entry.requestId}>
                      <div className="ai-row-main">
                        <span className="ai-rank">#{i + 2}</span>
                        <ScoreRing score={entry.score} size={44} stroke={4} />
                        <div className="ai-row-info">
                          <strong>{entry.beneficiaryName}</strong>
                          <RequestChips entry={entry} />
                        </div>
                        {hasFactors(entry) && (
                          <button
                            type="button"
                            className="ai-why"
                            onClick={() => setOpenId(open ? null : entry.requestId)}
                            aria-expanded={open}
                          >
                            Why? <ChevronDown size={14} />
                          </button>
                        )}
                        <Actions entry={entry} onView={onView} />
                      </div>
                      {open && (
                        <div className="ai-row-detail">
                          <FactorBars entry={entry} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}

/** Compact table cell for the Food Requests list. */
export function AIMatchCell({ insight }) {
  if (!insight) return <span className="ai-cell-empty">—</span>;
  const reason = insight.reasons?.[0] || insight.justification;
  return (
    <div className="ai-cell">
      <ScoreRing score={insight.score} size={36} stroke={4} label={false} />
      <div>
        <strong>
          {matchPercent(insight.score)}% match
          {insight.rank === 1 && insight.total > 1 && <span className="ai-cell-top">Top pick</span>}
        </strong>
        <span>{insight.rank === 1 ? reason : `#${insight.rank} of ${insight.total}${reason ? ` · ${reason}` : ""}`}</span>
      </div>
    </div>
  );
}

/** Insight block for the request detail modal; the factor breakdown folds away so the popup stays short. */
export function AIInsightCard({ insight }) {
  const [open, setOpen] = useState(false);
  if (!insight) return null;
  const explained = hasFactors(insight);
  return (
    <div className="ai-insight">
      <div className="ai-insight-head">
        <ScoreRing score={insight.score} size={60} stroke={6} />
        <div className="ai-insight-text">
          <span className="ai-panel-badge ai-panel-badge-soft">
            <Sparkles size={12} /> AI Match
          </span>
          <strong>
            {insight.rank === 1 ? (
              <>
                <Crown size={14} className="ai-insight-crown" /> Top pick
              </>
            ) : (
              `Ranked #${insight.rank}`
            )}{" "}
            <em>of {insight.total} pending</em>
          </strong>
        </div>
      </div>
      {insight.reasons?.length > 0 && (
        <div className="ai-insight-reasons">
          {insight.reasons.map((r) => (
            <span key={r} className="ai-insight-reason">
              <Check size={12} /> {r}
            </span>
          ))}
        </div>
      )}
      {explained && (
        <>
          <button type="button" className="ai-insight-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide breakdown" : "Why this match?"} <ChevronDown size={14} />
          </button>
          {open && (
            <div className="ai-insight-factors">
              <FactorBars entry={insight} compact />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Overview strip for the Food Requests page: one card per item with pending
 * requests, showing the AI's top pick. Picking a card opens the full ranking.
 */
export function AIMatchOverview({ items, rankings, loading, error, selectedId, onSelect }) {
  const reduce = useReducedMotion();
  return (
    <section className="ai-overview">
      <header className="ai-overview-head">
        <div className="ai-overview-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <h3>AI Smart Match</h3>
          <p>
            {items.length
              ? `${items.length} ${items.length === 1 ? "item has" : "items have"} pending requests. Pick one to see who the AI recommends.`
              : "Ranks pending requests by urgency, proximity, people served, capacity and fair share."}
          </p>
        </div>
        {loading && <span className="ai-overview-status">Analyzing…</span>}
      </header>

      {error && <div className="ai-offline">{error}</div>}

      {items.length === 0 ? (
        <div className="ai-overview-empty">
          <Check size={16} /> All caught up. No pending requests need a decision.
        </div>
      ) : (
        <div className="ai-item-grid">
          {items.map(({ itemId, name, pendingCount }, i) => {
            const ranking = rankings[itemId];
            const top = ranking?.[0];
            const reason = top && topReasons(top, 1)[0];
            const active = String(selectedId) === String(itemId);
            return (
              <motion.button
                type="button"
                key={itemId}
                className={active ? "ai-item-card active" : "ai-item-card"}
                onClick={() => onSelect(active ? null : itemId)}
                aria-pressed={active}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.04 }}
              >
                <div className="ai-item-head">
                  <strong>{name}</strong>
                  <span className="ai-chip">{pendingCount} pending</span>
                </div>
                {top ? (
                  <div className="ai-item-pick">
                    <ScoreRing score={top.score} size={42} stroke={4} />
                    <div>
                      <span className="ai-item-label">
                        <Crown size={11} /> Top pick
                      </span>
                      <strong>{top.beneficiaryName}</strong>
                      {reason && <span className="ai-item-reason">{reason}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="ai-item-pick ai-item-pick-loading">
                    <span className="ai-skeleton ai-skeleton-ring" />
                    <div>
                      <span className="ai-skeleton" style={{ width: "50%" }} />
                      <span className="ai-skeleton" style={{ width: "80%" }} />
                    </div>
                  </div>
                )}
                <span className="ai-item-cta">
                  {active ? "Hide ranking" : "View ranking"} <ChevronDown size={14} />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </section>
  );
}
