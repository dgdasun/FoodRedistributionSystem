import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, Package, Gauge, MapPin, CircleDot, ShieldCheck, Clock, Minus, Plus, Check, Ban, ArrowLeft, Sparkles } from "lucide-react";
import { avatarUrl } from "../avatar.js";
import { AIInsightCard } from "./AIRecommendations.jsx";

const STATUS_LABEL = { counter_offer: "Partial Offer" };

const QUICK_REASONS = [
  "Allocated to a more urgent request",
  "Not enough quantity left",
  "Pickup distance too far",
  "Item no longer available",
];

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Detail popup for one food request. Pending requests can be accepted in full,
 * partly (which sends a counter-offer), or declined with a reason.
 */
export default function RequestDetailModal({ request, onClose, onAct, aiInsight, onOpenAI }) {
  const reduce = useReducedMotion();
  const beneficiary = request.beneficiary;
  const requested = request.quantityKg;
  const [approveQty, setApproveQty] = useState(requested);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const qty = Number(approveQty);
  const qtyValid = qty > 0 && qty <= requested;
  const partial = qtyValid && qty < requested;
  const setQty = (v) => setApproveQty(round1(Math.min(requested, Math.max(0.1, v))));

  const submit = async (status, extra) => {
    setBusy(true);
    try {
      await onAct(request.id, status, extra);
    } finally {
      setBusy(false);
    }
  };

  const name = beneficiary?.organizationName || beneficiary?.name || "Unknown organization";
  const photo = avatarUrl(beneficiary);
  const urgency = request.urgency || "medium";
  const isPending = request.status === "pending";

  return (
    <motion.div
      className="rq-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="rq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rq-title"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="rq-head">
          <div className="rq-head-icon">
            <Package size={20} />
          </div>
          <div className="rq-head-text">
            <h3 id="rq-title">{request.item?.name || "Item"}</h3>
            {request.createdAt && (
              <span>
                <Clock size={12} /> Requested {new Date(request.createdAt).toLocaleString()}
              </span>
            )}
          </div>
          <button type="button" className="rq-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="rq-body">
          <div className="rq-org">
            <div className="rq-avatar">{photo ? <img src={photo} alt="" /> : name.charAt(0).toUpperCase()}</div>
            <div className="rq-org-text">
              <strong>{name}</strong>
              <span>
                {beneficiary?.orgType || "Beneficiary"}
                {beneficiary?.location ? ` · ${beneficiary.location}` : ""}
              </span>
            </div>
            {beneficiary?.verified && (
              <span className="rq-verified">
                <ShieldCheck size={13} /> Verified
              </span>
            )}
          </div>

          <div className="rq-stats">
            <div className="rq-stat">
              <Package size={15} />
              <span>Requested</span>
              <strong>{requested} kg</strong>
            </div>
            <div className="rq-stat">
              <Gauge size={15} />
              <span>Urgency</span>
              <strong className={`rq-urgency rq-urgency-${urgency}`}>{urgency}</strong>
            </div>
            <div className="rq-stat">
              <MapPin size={15} />
              <span>Distance</span>
              <strong>{request.distanceKm} km</strong>
            </div>
            <div className="rq-stat">
              <CircleDot size={15} />
              <span>Status</span>
              <strong className={`rq-status rq-status-${request.status}`}>{STATUS_LABEL[request.status] || request.status}</strong>
            </div>
          </div>

          {isPending && <AIInsightCard insight={aiInsight} />}
        </div>

        <footer className="rq-foot">
          {!isPending ? (
            <button className="btn btn-outline rq-btn-full" onClick={onClose}>
              Close
            </button>
          ) : onOpenAI ? (
            <div className="rq-ai-only">
              <p>
                Other requesters want this item too, so it is allocated through <strong>AI Smart Match</strong>.
              </p>
              <button className="btn btn-primary rq-btn-full" onClick={onOpenAI}>
                <Sparkles size={15} /> Open AI Smart Match
              </button>
            </div>
          ) : showReject ? (
            <div className="rq-reject">
              <label htmlFor="rq-reason">Reason for declining (shown to the requester)</label>
              <div className="rq-reason-chips">
                {QUICK_REASONS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={rejectReason === r ? "rq-reason-chip active" : "rq-reason-chip"}
                    onClick={() => setRejectReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                id="rq-reason"
                rows={3}
                placeholder="Or write your own reason…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="rq-actions">
                <button className="btn btn-outline" onClick={() => setShowReject(false)} disabled={busy}>
                  <ArrowLeft size={15} /> Back
                </button>
                <button className="btn rq-btn-danger" onClick={() => submit("rejected", { reason: rejectReason })} disabled={busy}>
                  <Ban size={15} /> {busy ? "Declining…" : "Confirm decline"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rq-qty">
                <div className="rq-qty-head">
                  <label htmlFor="rq-qty">Quantity to give</label>
                  {partial && <span className="rq-qty-note">Sends a counter-offer</span>}
                </div>
                <div className="rq-qty-row">
                  <div className="rq-stepper">
                    <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= 0.1} aria-label="Decrease">
                      <Minus size={15} />
                    </button>
                    <input
                      id="rq-qty"
                      type="number"
                      min={0.1}
                      max={requested}
                      step={0.1}
                      value={approveQty}
                      onChange={(e) => setApproveQty(e.target.value)}
                    />
                    <span className="rq-stepper-unit">kg</span>
                    <button type="button" onClick={() => setQty(qty + 1)} disabled={qty >= requested} aria-label="Increase">
                      <Plus size={15} />
                    </button>
                  </div>
                  <input
                    type="range"
                    className="rq-range"
                    min={0.1}
                    max={requested}
                    step={0.1}
                    value={qtyValid ? qty : requested}
                    onChange={(e) => setApproveQty(Number(e.target.value))}
                    aria-label="Quantity slider"
                    style={{ "--fill": `${((qtyValid ? qty : requested) / requested) * 100}%` }}
                  />
                </div>
                <span className="rq-qty-hint">of {requested} kg requested</span>
              </div>
              <div className="rq-actions">
                <button className="btn rq-btn-danger-outline" onClick={() => setShowReject(true)} disabled={busy}>
                  <Ban size={15} /> Decline
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => submit("approved", { approvedQuantityKg: qty })}
                  disabled={busy || !qtyValid}
                >
                  <Check size={15} /> {busy ? "Saving…" : partial ? "Send counter-offer" : "Accept request"}
                </button>
              </div>
            </>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}
