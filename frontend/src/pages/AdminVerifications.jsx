import React, { useEffect, useMemo, useState } from "react";
import {
  Clock, Search, MapPin, User, Mail, Phone, FileText, Eye, Download, Check, X, AlertTriangle, ShieldCheck,
  ShieldX, Hash, Loader2, Users as UsersIcon,
} from "lucide-react";
import { api } from "../api.js";
import { getRelativeTime, formatExactTime } from "../timeAgo.js";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { useToast } from "../components/Toast.jsx";
import { IconShieldCheck, IconInbox, IconStatPeople } from "../components/Icons.jsx";
import { verificationStatusOf } from "../verification.js";
import "../styles/food-requests.css";
import "../styles/admin-verifications.css";

const ROLE_LABEL = { donor: "Donor", beneficiary: "NGO / Charity", farm: "Farm / Compost" };

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const ROLE_FILTERS = [
  { value: "", label: "All account types" },
  { value: "donor", label: "Donors" },
  { value: "beneficiary", label: "NGOs / Charities" },
  { value: "farm", label: "Farms / Compost" },
];

const REJECTION_REASONS = [
  "Invalid / Unclear Document",
  "Mismatched Organization Details",
  "Expired Business Registration / Certificate",
  "Suspected Fake / Fraudulent Account",
  "Other",
];

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

const cleanDocName = (doc) => doc.replace(/^\d+-/, "");

/**
 * When the account last submitted documents for review. verificationSubmittedAt
 * is stamped on every upload; accounts that uploaded before that field existed
 * fall back to the millisecond prefix VerificationDocumentService puts on each
 * stored filename, then to account creation.
 */
function submittedAtOf(b) {
  if (b.verificationSubmittedAt) return b.verificationSubmittedAt;
  const docs = b.verificationDocuments || [];
  const stamp = docs.length ? Number(docs[docs.length - 1].split("-")[0]) : NaN;
  if (stamp > 0) return new Date(stamp);
  return b.createdAt || null;
}

function TimeBadge({ label, at, tone = "neutral" }) {
  const relative = getRelativeTime(at);
  if (!relative) return null;
  return (
    <span className={`av-time av-time-${tone}`} title={formatExactTime(at)}>
      <Clock size={12} strokeWidth={2.25} aria-hidden="true" />
      {label} {relative}
    </span>
  );
}

function RoleChip({ role }) {
  return <span className={`av-role av-role-${role}`}>{ROLE_LABEL[role] || role}</span>;
}

/** Every uploaded file, each with its own view / download. */
function Documents({ userId, documents, compact = false }) {
  const docs = documents || [];
  if (docs.length === 0) {
    return (
      <div className="av-doc-none">
        <AlertTriangle size={14} /> No document uploaded{compact ? "" : " - the account must upload one before it can be approved."}
      </div>
    );
  }
  return (
    <div className="av-docs">
      {docs.map((doc) => (
        <div className="av-doc" key={doc}>
          <span className="av-doc-icon"><FileText size={16} /></span>
          <span className="av-doc-name" title={cleanDocName(doc)}>{cleanDocName(doc)}</span>
          <a className="av-doc-btn" href={`/api/beneficiaries/${userId}/documents/${doc}`} target="_blank" rel="noreferrer" aria-label={`View ${cleanDocName(doc)}`}>
            <Eye size={14} />
          </a>
          <button
            type="button"
            className="av-doc-btn"
            onClick={() => api.download(`/beneficiaries/${userId}/documents/${doc}`, cleanDocName(doc))}
            aria-label={`Download ${cleanDocName(doc)}`}
          >
            <Download size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function PendingCard({ b, busy, onApprove, onReject }) {
  const docs = b.verificationDocuments || [];
  const checks = [
    { ok: docs.length > 0, label: docs.length ? `${docs.length} document${docs.length === 1 ? "" : "s"} uploaded` : "No document yet" },
    { ok: !!b.registrationNumber, label: b.registrationNumber ? "Registration number given" : "No registration number" },
    { ok: !!b.location, label: b.location ? "Location set" : "No location" },
  ];
  return (
    <article className="av-card av-pending">
      <header className="av-card-head">
        <span className={`av-avatar av-avatar-${b.role}`}>{initialsOf(b.organizationName || b.name)}</span>
        <div className="av-card-title">
          <div className="av-card-name">
            <strong>{b.organizationName || b.name}</strong>
            <RoleChip role={b.role} />
          </div>
          <TimeBadge label="Submitted" at={submittedAtOf(b)} />
        </div>
      </header>

      <dl className="av-facts">
        {b.name && <div><dt><User size={13} /> Contact</dt><dd>{b.name}</dd></div>}
        {b.email && <div><dt><Mail size={13} /> Email</dt><dd title={b.email}>{b.email}</dd></div>}
        {b.phone && <div><dt><Phone size={13} /> Phone</dt><dd>{b.phone}</dd></div>}
        {b.location && <div><dt><MapPin size={13} /> Location</dt><dd>{b.location}</dd></div>}
        {b.registrationNumber && <div><dt><Hash size={13} /> Reg. no.</dt><dd>{b.registrationNumber}</dd></div>}
        {b.organizationSize > 0 && <div><dt><UsersIcon size={13} /> Serves</dt><dd>{b.organizationSize} people</dd></div>}
      </dl>

      <Documents userId={b.id} documents={docs} />

      <footer className="av-card-foot">
        <ul className="av-checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : "miss"}>
              {c.ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />} {c.label}
            </li>
          ))}
        </ul>
        <div className="av-actions">
          <button type="button" className="av-btn av-btn-reject" onClick={() => onReject(b)} disabled={busy}>
            <ShieldX size={15} /> Reject
          </button>
          <button
            type="button"
            className="av-btn av-btn-approve"
            onClick={() => onApprove(b)}
            disabled={busy || docs.length === 0}
            title={docs.length === 0 ? "Verification document required for approval" : undefined}
          >
            {busy ? <Loader2 size={15} className="av-spin" /> : <ShieldCheck size={15} />} Approve
          </button>
        </div>
      </footer>
    </article>
  );
}

function ReviewedRow({ b, status }) {
  const approved = status === "approved";
  return (
    <article className={`av-card av-row av-row-${status}`}>
      <span className={`av-avatar av-avatar-${b.role}`}>{initialsOf(b.organizationName || b.name)}</span>
      <div className="av-row-main">
        <div className="av-card-name">
          <strong>{b.organizationName || b.name}</strong>
          <RoleChip role={b.role} />
          <span className={`av-status av-status-${status}`}>
            {approved ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
            {approved ? "Verified" : "Rejected"}
          </span>
        </div>
        <div className="av-row-meta">
          {b.location && <span><MapPin size={12} /> {b.location}</span>}
          {b.name && <span><User size={12} /> {b.name}</span>}
          <span><FileText size={12} /> {(b.verificationDocuments || []).length} document{(b.verificationDocuments || []).length === 1 ? "" : "s"}</span>
        </div>
        {!approved && b.rejectionReason && <div className="av-reason">“{b.rejectionReason}”</div>}
        {(b.verificationDocuments || []).length > 0 && <Documents userId={b.id} documents={b.verificationDocuments} compact />}
      </div>
      {b.verificationReviewedAt ? (
        <TimeBadge label={approved ? "Approved" : "Rejected"} at={b.verificationReviewedAt} tone={status} />
      ) : (
        <TimeBadge label="Joined" at={b.createdAt} />
      )}
    </article>
  );
}

function RejectModal({ target, onClose, onConfirm }) {
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      setError("Please describe the reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(finalReason);
    } catch (e) {
      setError(e.message || "Failed to reject account.");
      setSubmitting(false);
    }
  };

  return (
    <div className="rq-overlay" onClick={onClose}>
      <div className="rq-modal av-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="av-reject-title">
        <div className="rq-head">
          <div className="rq-head-icon av-head-danger"><ShieldX size={20} /></div>
          <div className="rq-head-text">
            <h3 id="av-reject-title">Reject verification</h3>
            <span>{target.organizationName || target.name} will be told why.</span>
          </div>
        </div>
        <div className="rq-body">
          <span className="av-label">Reason</span>
          <div className="av-reasons" role="radiogroup" aria-label="Rejection reason">
            {REJECTION_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                className={reason === r ? "av-reason-chip active" : "av-reason-chip"}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === "Other" && (
            <textarea
              className="av-textarea"
              rows={3}
              placeholder="Explain why this account is being rejected…"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              autoFocus
            />
          )}
          {error && <p className="av-error">{error}</p>}
        </div>
        <div className="rq-foot">
          <div className="rq-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="button" className="btn av-btn-danger" onClick={confirm} disabled={submitting}>
              {submitting ? "Rejecting…" : "Confirm rejection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifications() {
  const toast = useToast();
  const [accounts, setAccounts] = useState(null);
  const [tab, setTab] = useState("pending");
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // One request for every reviewed account; each is bucketed with the shared
  // rule in verification.js rather than by the raw verificationStatus field.
  const load = () =>
    api
      .get("/beneficiaries")
      .then((d) => setAccounts(d.beneficiaries || []))
      .catch((e) => {
        toast.error(e.message);
        setAccounts((prev) => prev || []);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = accounts || [];
  const loading = accounts === null;

  const counts = useMemo(() => {
    const c = { all: all.length, pending: 0, approved: 0, rejected: 0 };
    all.forEach((b) => { c[verificationStatusOf(b)] += 1; });
    return c;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((b) => tab === "all" || verificationStatusOf(b) === tab)
      .filter((b) => !role || b.role === role)
      .filter((b) => !q || [b.organizationName, b.name, b.email, b.location].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
      // The review queue is first-come first-served; history reads newest first.
      .sort((a, b) => {
        const t = (x) => new Date(submittedAtOf(x) || 0).getTime() || 0;
        const d = t(a) - t(b);
        return tab === "pending" ? d : -d;
      });
  }, [all, tab, role, query]);

  const missingDocs = all.filter((b) => verificationStatusOf(b) === "pending" && !(b.verificationDocuments || []).length).length;

  const approve = async (b) => {
    setBusyId(b.id);
    try {
      await api.patch(`/beneficiaries/${b.id}/verify`, { verified: true });
      toast.success(`${b.organizationName || b.name} is now verified.`);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to approve account.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (reason) => {
    await api.patch(`/beneficiaries/${rejectTarget.id}/reject`, { reason });
    toast.success(`${rejectTarget.organizationName || rejectTarget.name} was rejected.`);
    setRejectTarget(null);
    await load();
  };

  const dash = (v) => (loading ? "—" : v);

  return (
    <>
      <div className="page-header">
        <h1>Account Verifications</h1>
        <p>Review the documents of donors, NGOs and farm / compost partners before they can fully use the platform.</p>
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconInbox size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Waiting for review"
          value={dash(counts.pending)}
          sub={counts.pending ? "Oldest first in the queue" : "Queue is clear"}
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Verified"
          value={dash(counts.approved)}
          sub={`of ${counts.all} reviewed accounts`}
        />
        <StatCard
          icon={<ShieldX size={26} color="var(--status-danger-fg)" />}
          iconBg="var(--status-danger-bg)"
          label="Rejected"
          value={dash(counts.rejected)}
          sub="Told why, can reapply"
        />
        <StatCard
          icon={<IconStatPeople size={26} color="var(--status-violet-fg)" />}
          iconBg="var(--status-violet-bg)"
          label="Missing documents"
          value={dash(missingDocs)}
          sub="Pending, can't be approved yet"
        />
      </Stagger>

      <div className="card fr-panel">
        <div className="fr-toolbar">
          <div className="fr-tabs" role="tablist" aria-label="Filter by status">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`fr-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="fr-count">{dash(counts[t.key])}</span>
              </button>
            ))}
          </div>
          <div className="fr-tools">
            <select className="fr-select" aria-label="Account type" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="fr-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search organization, contact or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search accounts"
              />
            </label>
          </div>
        </div>

        {loading && (
          <div className="av-list">
            {Array.from({ length: 2 }).map((_, i) => <div key={i} className="av-card av-skel" aria-hidden="true" />)}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="av-empty">
            <div className="av-empty-icon">{tab === "pending" ? <ShieldCheck size={26} /> : <UsersIcon size={26} />}</div>
            <strong>{tab === "pending" && !query && !role ? "All caught up" : "Nothing here"}</strong>
            <p>
              {tab === "pending" && !query && !role
                ? "No accounts are waiting for review. New sign-ups appear here once they register."
                : "No accounts match this view."}
            </p>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="av-list">
            {visible.map((b) => {
              const status = verificationStatusOf(b);
              return status === "pending" ? (
                <PendingCard key={b.id} b={b} busy={busyId === b.id} onApprove={approve} onReject={setRejectTarget} />
              ) : (
                <ReviewedRow key={b.id} b={b} status={status} />
              );
            })}
          </div>
        )}
      </div>

      {rejectTarget && <RejectModal target={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={reject} />}
    </>
  );
}
