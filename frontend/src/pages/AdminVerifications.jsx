import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api } from "../api.js";
import { getRelativeTime, formatExactTime } from "../timeAgo.js";
import { IconMapPin, IconUser, IconDocument, IconEye, IconDownload, IconShieldCheck } from "../components/Icons.jsx";

const ROLE_LABEL = {
  donor: "Donor",
  beneficiary: "NGO / Charity",
  farm: "Farm / Compost",
};

const ROLE_CLASS = {
  donor: "donor",
  beneficiary: "beneficiary",
  farm: "farm",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "donor", label: "Donors" },
  { key: "beneficiary", label: "Beneficiaries / NGOs" },
];

const REJECTION_REASONS = [
  "Invalid / Unclear Document",
  "Mismatched Organization Details",
  "Expired Business Registration / Certificate",
  "Suspected Fake / Fraudulent Account",
  "Other",
];

function matchesTab(b, tab) {
  if (tab === "all") return true;
  if (tab === "donor") return b.role === "donor";
  return b.role === "beneficiary" || b.role === "farm";
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

function roleLabel(b) {
  return ROLE_LABEL[b.role] || b.orgType || b.role;
}

function cleanDocName(doc) {
  return doc.replace(/^\d+-/, "");
}

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

const TIME_BADGE_TONE = {
  neutral: "bg-gray-100 text-gray-600",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
};

function TimeBadge({ label, at, tone = "neutral" }) {
  const relative = getRelativeTime(at);
  if (!relative) return null;

  return (
    <span
      className={`ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TIME_BADGE_TONE[tone]}`}
      title={formatExactTime(at)}
    >
      <Clock size={12} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
      {label} {relative}
    </span>
  );
}

/**
 * Approved/rejected cards show when the admin decided. Accounts reviewed before
 * verificationReviewedAt existed have no decision time on record, so they show
 * the submission time instead of a made-up review time.
 */
function ReviewedBadge({ b, label, tone }) {
  if (b.verificationReviewedAt) {
    return <TimeBadge label={label} at={b.verificationReviewedAt} tone={tone} />;
  }
  return <TimeBadge label="Submitted" at={submittedAtOf(b)} />;
}

function DocumentSection({ userId, documents }) {
  const docs = documents || [];
  return (
    <div className="verify-doc-row">
      {docs.length === 0 ? (
        <span className="verify-doc-none">
          <IconDocument size={14} />
          No document uploaded
        </span>
      ) : (
        docs.map((doc) => (
          <div className="verify-doc-name" key={doc} title={cleanDocName(doc)}>
            <IconDocument size={14} />
            {cleanDocName(doc)}
          </div>
        ))
      )}
      {docs.length > 0 && (
        <div className="verify-doc-actions">
          <a
            className="btn-outline-sm"
            href={`/api/beneficiaries/${userId}/documents/${docs[docs.length - 1]}`}
            target="_blank"
            rel="noreferrer"
          >
            <IconEye size={13} />
            View Document
          </a>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() =>
              api.download(
                `/beneficiaries/${userId}/documents/${docs[docs.length - 1]}`,
                cleanDocName(docs[docs.length - 1])
              )
            }
          >
            <IconDownload size={13} />
            Download
          </button>
        </div>
      )}
    </div>
  );
}

function PendingCard({ b, onApprove, onReject }) {
  const hasDocument = (b.verificationDocuments || []).length > 0;
  return (
    <div className="verify-card">
      <div className="verify-avatar">{initialsOf(b.organizationName || b.name)}</div>
      <div className="verify-body">
        <div className="verify-top-row">
          <span className="verify-org-name">{b.organizationName || b.name}</span>
          <span className={`role-badge ${ROLE_CLASS[b.role] || ""}`}>{roleLabel(b)}</span>
          <TimeBadge label="Submitted" at={submittedAtOf(b)} />
        </div>
        <div className="verify-meta-row">
          {b.location && (
            <span className="meta-item">
              <IconMapPin size={13} color="var(--text-light)" />
              {b.location}
            </span>
          )}
          {b.name && (
            <span className="meta-item">
              <IconUser size={13} color="var(--text-light)" />
              {b.name}
            </span>
          )}
        </div>
        <DocumentSection userId={b.id} documents={b.verificationDocuments} />
        <div className="verify-actions-row">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onApprove(b.id)}
            disabled={!hasDocument}
            title={!hasDocument ? "Verification document required for approval" : undefined}
          >
            Approve
          </button>
          <button className="btn btn-danger-outline btn-sm" onClick={() => onReject(b)}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function VerifiedCard({ b }) {
  return (
    <div className="verify-card">
      <div className="verify-avatar">{initialsOf(b.organizationName || b.name)}</div>
      <div className="verify-body">
        <div className="verify-top-row">
          <span className="verify-org-name">{b.organizationName || b.name}</span>
          <span className={`role-badge ${ROLE_CLASS[b.role] || ""}`}>{roleLabel(b)}</span>
          <span className="verified-pill">
            <IconShieldCheck size={12} />
            Verified
          </span>
          <ReviewedBadge b={b} label="Approved" tone="approved" />
        </div>
        <div className="verify-meta-row">
          {b.location && (
            <span className="meta-item">
              <IconMapPin size={13} color="var(--text-light)" />
              {b.location}
            </span>
          )}
        </div>
        <DocumentSection userId={b.id} documents={b.verificationDocuments} />
      </div>
    </div>
  );
}

function RejectedCard({ b }) {
  return (
    <div className="verify-card">
      <div className="verify-avatar">{initialsOf(b.organizationName || b.name)}</div>
      <div className="verify-body">
        <div className="verify-top-row">
          <span className="verify-org-name">{b.organizationName || b.name}</span>
          <span className={`role-badge ${ROLE_CLASS[b.role] || ""}`}>{roleLabel(b)}</span>
          <span className="rejected-pill">Rejected</span>
          <ReviewedBadge b={b} label="Rejected" tone="rejected" />
        </div>
        <div className="verify-meta-row">
          {b.location && (
            <span className="meta-item">
              <IconMapPin size={13} color="var(--text-light)" />
              {b.location}
            </span>
          )}
        </div>
        {b.rejectionReason && (
          <div style={{ fontSize: 12.5, color: "var(--status-danger-fg)", marginBottom: 10 }}>
            <strong>Reason:</strong> {b.rejectionReason}
          </div>
        )}
        <DocumentSection userId={b.id} documents={b.verificationDocuments} />
      </div>
    </div>
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
      setError("Please provide a rejection reason.");
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Reject Verification</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "0 0 16px" }}>
          {target.organizationName || target.name} will be notified that their verification was rejected.
        </p>

        <div className="form-row">
          <label>Rejection reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {reason === "Other" && (
          <div className="form-row">
            <label>Describe the reason</label>
            <textarea
              rows={3}
              placeholder="Explain why this account is being rejected..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          </div>
        )}

        {error && <div style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-danger-outline" style={{ flex: 1 }} onClick={confirm} disabled={submitting}>
            {submitting ? "Rejecting..." : "Confirm Rejection"}
          </button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerifications() {
  const [pending, setPending] = useState([]);
  const [verified, setVerified] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [tab, setTab] = useState("all");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionError, setActionError] = useState("");

  const load = () => {
    api.get("/beneficiaries?status=pending").then((d) => setPending(d.beneficiaries));
    api.get("/beneficiaries?status=approved").then((d) => setVerified(d.beneficiaries));
    api.get("/beneficiaries?status=rejected").then((d) => setRejected(d.beneficiaries));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    setActionError("");
    try {
      await api.patch(`/beneficiaries/${id}/verify`, { verified: true });
      load();
    } catch (e) {
      setActionError(e.message || "Failed to approve account.");
    }
  };

  const reject = async (reason) => {
    await api.patch(`/beneficiaries/${rejectTarget.id}/reject`, { reason });
    setRejectTarget(null);
    load();
  };

  const pendingFiltered = pending.filter((b) => matchesTab(b, tab));
  const verifiedFiltered = verified.filter((b) => matchesTab(b, tab));
  const rejectedFiltered = rejected.filter((b) => matchesTab(b, tab));

  return (
    <>
      <div className="page-header">
        <h1>Account Verifications</h1>
        <p>Approve donors, NGOs, charities and farm/compost partners before they can fully use the platform.</p>
      </div>

      <div className="toolbar">
        <div className="pill-tabs">
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`pill-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              style={{ cursor: "pointer" }}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="card" style={{ marginBottom: 20, color: "var(--danger)", fontSize: 13 }}>
          {actionError}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <h3>⏳ Pending Approval ({pendingFiltered.length})</h3>
        </div>
        <div className="verify-list">
          {pendingFiltered.map((b) => (
            <PendingCard key={b.id} b={b} onApprove={approve} onReject={setRejectTarget} />
          ))}
        </div>
        {pendingFiltered.length === 0 && <div className="empty-state">No pending verifications 🎉</div>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <h3>✅ Verified Partners ({verifiedFiltered.length})</h3>
        </div>
        <div className="verify-list">
          {verifiedFiltered.map((b) => (
            <VerifiedCard key={b.id} b={b} />
          ))}
        </div>
        {verifiedFiltered.length === 0 && <div className="empty-state">No verified partners yet.</div>}
      </div>

      <div className="card">
        <div className="card-title">
          <h3>❌ Rejected ({rejectedFiltered.length})</h3>
        </div>
        <div className="verify-list">
          {rejectedFiltered.map((b) => (
            <RejectedCard key={b.id} b={b} />
          ))}
        </div>
        {rejectedFiltered.length === 0 && <div className="empty-state">No rejected accounts.</div>}
      </div>

      {rejectTarget && <RejectModal target={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={reject} />}
    </>
  );
}
