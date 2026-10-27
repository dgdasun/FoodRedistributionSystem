import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { avatarUrl } from "../avatar.js";
import { navItemsFor } from "../nav.js";
import VerificationUpload from "../components/VerificationUpload.jsx";
import BeneficiaryVerificationUpload from "../components/BeneficiaryVerificationUpload.jsx";
import { AppearancePicker } from "../components/ThemeToggle.jsx";
import {
  IconUser,
  IconInbox,
  IconShieldCheck,
  IconStatPeople,
  IconTruck,
  IconGlobe,
  IconMapPin,
  IconCamera,
  IconTrash,
  IconSpinner,
  IconCalendar,
  IconWeight,
  IconTicket,
  IconStatBowl,
  IconStatCO2,
  IconStatStore,
  IconDocument,
} from "../components/Icons.jsx";
import "../styles/profile.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ROLE_LABEL = {
  donor: "Donor",
  beneficiary: "Beneficiary",
  farm: "Farm / Compost partner",
  admin: "Administrator",
};

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function formatNumber(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** "verified" | "rejected" | "pending" - admins are always treated as verified. */
function verificationState(user) {
  if (user.role === "admin" || user.verified) return "verified";
  if (user.verificationStatus === "rejected") return "rejected";
  return "pending";
}

/** Circular profile photo with upload / replace / remove controls. */
function AvatarEditor({ user }) {
  const { login } = useAuth();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const photo = preview || avatarUrl(user);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const pickFile = () => {
    if (!busy) inputRef.current?.click();
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That image is larger than 5MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { user: updated } = await api.upload(`/users/${user.id}/avatar`, formData);
      login(updated);
      setNotice("Profile photo updated");
    } catch (err) {
      setError(err.message || "Failed to upload photo.");
    } finally {
      setPreview(null);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const { user: updated } = await api.del(`/users/${user.id}/avatar`);
      login(updated);
      setNotice("Profile photo removed");
    } catch (err) {
      setError(err.message || "Failed to remove photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-avatar-block">
      <div className="pf-avatar-ring">
        <button
          type="button"
          className="pf-avatar"
          onClick={pickFile}
          disabled={busy}
          aria-label={photo ? "Change profile photo" : "Upload profile photo"}
        >
          {photo ? (
            <img src={photo} alt={user.name || "Profile photo"} />
          ) : user.name ? (
            <span className="pf-initials">{initials(user.name)}</span>
          ) : (
            <IconUser size={40} />
          )}
          {!busy && (
            <span className="pf-avatar-hover">
              <IconCamera size={22} />
              <span>{photo ? "Change" : "Add photo"}</span>
            </span>
          )}
          {busy && (
            <span className="pf-avatar-busy">
              <IconSpinner size={26} className="animate-spin" />
            </span>
          )}
        </button>
        <button type="button" className="pf-camera" onClick={pickFile} disabled={busy} aria-hidden="true" tabIndex={-1}>
          <IconCamera size={15} />
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(",")} onChange={upload} hidden />
      </div>

      <div className="pf-photo-actions">
        <button type="button" className="pf-chip-btn" onClick={pickFile} disabled={busy}>
          <IconCamera size={14} />
          {avatarUrl(user) ? "Change photo" : "Upload photo"}
        </button>
        {avatarUrl(user) && (
          <button type="button" className="pf-chip-btn pf-chip-danger" onClick={remove} disabled={busy}>
            <IconTrash size={14} />
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="pf-flash pf-flash-error">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="pf-flash pf-flash-ok">
          {notice}
        </p>
      )}
    </div>
  );
}

function VerificationBadge({ state }) {
  const meta = {
    verified: { label: "Verified", tone: "ok" },
    rejected: { label: "Rejected", tone: "danger" },
    pending: { label: "Pending verification", tone: "warn" },
  }[state];
  return (
    <span className={`pf-badge pf-badge-${meta.tone}`}>
      <IconShieldCheck size={14} />
      {meta.label}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="pf-info">
      <span className="pf-info-icon">{icon}</span>
      <div className="pf-info-text">
        <span className="pf-info-label">{label}</span>
        <span className="pf-info-value">{value}</span>
      </div>
    </div>
  );
}

/** Three-step progress: documents in, under review, decision. */
function VerificationCard({ user }) {
  const state = verificationState(user);
  const docs = user.verificationDocuments || [];
  const steps = [
    { label: "Documents submitted", done: docs.length > 0 || state === "verified", date: user.verificationSubmittedAt },
    { label: "Under admin review", done: docs.length > 0 || state !== "pending", date: null },
    {
      label: state === "rejected" ? "Rejected" : "Verified",
      done: state !== "pending",
      failed: state === "rejected",
      date: user.verificationReviewedAt,
    },
  ];

  return (
    <section className="card pf-card">
      <div className="pf-card-head">
        <h2>Verification</h2>
        <VerificationBadge state={state} />
      </div>

      <ol className="pf-steps">
        {steps.map((s, i) => (
          <li key={s.label} className={`pf-step${s.done ? " done" : ""}${s.failed ? " failed" : ""}`}>
            <span className="pf-step-dot">{s.failed ? "!" : s.done ? "✓" : i + 1}</span>
            <span className="pf-step-label">{s.label}</span>
            {s.date && formatDate(s.date) && <span className="pf-step-date">{formatDate(s.date)}</span>}
          </li>
        ))}
      </ol>

      {state === "rejected" && (
        <div className="pf-callout pf-callout-danger">
          <strong>Reason:</strong> {user.rejectionReason || "Your documents could not be verified."} Upload a corrected
          document below to request another review.
        </div>
      )}
      {state === "pending" && (
        <div className="pf-callout pf-callout-warn">
          {docs.length === 0
            ? "Upload your registration certificate or licence so an administrator can verify your organization."
            : "An administrator is reviewing your documents. You'll get a notification once there is a decision."}
        </div>
      )}
      {state === "verified" && (
        <div className="pf-callout pf-callout-ok">
          Your organization is verified and shown to partners as trusted.
        </div>
      )}

      {state === "verified" ? (
        docs.length > 0 && (
          <ul className="pf-docs">
            {docs.map((doc) => (
              <li key={doc}>
                <IconDocument size={16} />
                <a href={`/api/beneficiaries/${user.id}/documents/${doc}`} target="_blank" rel="noreferrer">
                  {doc.replace(/^\d+-/, "")}
                </a>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="pf-upload">
          {user.role === "beneficiary" ? <BeneficiaryVerificationUpload user={user} embedded /> : <VerificationUpload user={user} />}
        </div>
      )}
    </section>
  );
}

/** Role-specific numbers, loaded from the same endpoints the dashboards use. */
function useRoleStats(user) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const done = (s) => !cancelled && setStats(s);
    const fail = () => !cancelled && setStats([]);

    if (user.role === "donor") {
      api
        .get(`/dashboard/${user.id}`)
        .then(({ stats: s = {} }) =>
          done([
            { icon: <IconStatStore size={22} />, label: "Donations", value: formatNumber(s.totalDonations) },
            { icon: <IconWeight size={20} />, label: "Food donated", value: `${formatNumber(s.totalFoodKg)} kg` },
            { icon: <IconStatBowl size={22} />, label: "Meals provided", value: formatNumber(s.mealsEquivalent) },
            { icon: <IconStatCO2 size={22} />, label: "CO₂ saved", value: `${formatNumber(s.co2SavedKg)} kg` },
          ])
        )
        .catch(fail);
    } else if (user.role === "beneficiary" || user.role === "farm") {
      Promise.all([api.get(`/requests?beneficiaryId=${user.id}`), api.get(`/tickets?beneficiaryId=${user.id}`)])
        .then(([r, t]) => {
          const requests = r.requests || [];
          const tickets = t.tickets || [];
          const receivedKg = tickets
            .filter((x) => x.status === "collected")
            .reduce((sum, x) => sum + (Number(x.quantityKg) || 0), 0);
          const active = tickets.filter(
            (x) => x.status === "pending" && (!x.expiresAt || new Date(x.expiresAt).getTime() > Date.now())
          ).length;
          const list = [
            { icon: <IconInbox size={20} />, label: "Requests made", value: formatNumber(requests.length) },
            { icon: <IconWeight size={20} />, label: "Food received", value: `${formatNumber(receivedKg)} kg` },
            { icon: <IconTicket size={20} />, label: "Active tickets", value: formatNumber(active) },
          ];
          if (user.role === "beneficiary" && user.organizationSize) {
            list.push({ icon: <IconStatPeople size={22} />, label: "People served", value: formatNumber(user.organizationSize) });
          } else if (user.handlingCapacityKg) {
            list.push({ icon: <IconTruck size={20} />, label: "Capacity", value: `${formatNumber(user.handlingCapacityKg)} kg` });
          }
          done(list);
        })
        .catch(fail);
    } else if (user.role === "admin") {
      api
        .get("/dashboard/admin/overview")
        .then((d) =>
          done([
            { icon: <IconStatPeople size={22} />, label: "Users", value: formatNumber(d.totalUsers) },
            { icon: <IconStatStore size={22} />, label: "Donors", value: formatNumber(d.totalDonors) },
            { icon: <IconInbox size={20} />, label: "Beneficiaries", value: formatNumber(d.totalBeneficiaries) },
            { icon: <IconTruck size={20} />, label: "Farms", value: formatNumber(d.totalFarms) },
          ])
        )
        .catch(fail);
    } else {
      done([]);
    }
    return () => {
      cancelled = true;
    };
  }, [user.id, user.role, user.organizationSize, user.handlingCapacityKg]);

  return stats;
}

export default function Profile() {
  const { user } = useAuth();
  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isDonor = role === "donor";
  const state = verificationState(user);
  const stats = useRoleStats(user);
  const memberSince = formatDate(user.createdAt);
  const links = navItemsFor(user).filter((i) => i.to !== "/profile" && i.to !== "/dashboard").slice(0, 4);

  const orgCategory = user.orgType && !["Donor", "Farm"].includes(user.orgType) ? user.orgType : null;
  const details = [
    { icon: <IconUser size={16} />, label: "Full name", value: user.name },
    { icon: <IconInbox size={16} />, label: "Email", value: user.email },
    user.phone && {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
        </svg>
      ),
      label: "Phone",
      value: user.phone,
    },
    !isAdmin &&
      user.organizationName && {
        icon: <IconGlobe size={16} />,
        label: isDonor ? "Business / store" : "Organization",
        value: user.organizationName,
      },
    !isAdmin && orgCategory && { icon: <IconShieldCheck size={16} />, label: "Category", value: orgCategory },
    !isAdmin &&
      user.location && {
        icon: <IconMapPin size={16} />,
        label: isDonor ? "Pickup address" : "Location",
        value: user.location,
      },
    user.registrationNumber && { icon: <IconDocument size={16} />, label: "Registration no.", value: user.registrationNumber },
    user.storageTypes?.length > 0 && { icon: <IconTruck size={16} />, label: "Storage", value: user.storageTypes.join(", ") },
  ].filter(Boolean);

  return (
    <div className="pf-page">
      {/* Cover + identity */}
      <section className="card pf-hero">
        <div className="pf-cover" aria-hidden="true">
          <svg className="pf-cover-art" viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice">
            <circle cx="520" cy="20" r="90" />
            <circle cx="430" cy="150" r="60" />
            <circle cx="80" cy="-10" r="70" />
          </svg>
        </div>
        <div className="pf-identity">
          <AvatarEditor user={user} />
          <div className="pf-id-text">
            <h1>{user.name}</h1>
            {!isAdmin && user.organizationName && <p className="pf-org">{user.organizationName}</p>}
            <div className="pf-tags">
              <span className="pf-badge pf-badge-role">{ROLE_LABEL[role] || user.role}</span>
              {!isAdmin && <VerificationBadge state={state} />}
              {memberSince && (
                <span className="pf-since">
                  <IconCalendar size={13} />
                  Member since {memberSince}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="pf-grid">
        <div className="pf-main">
          <section className="card pf-card">
            <div className="pf-card-head">
              <h2>Account details</h2>
            </div>
            <div className="pf-info-grid">
              {details.map((row) => (
                <InfoRow key={row.label} {...row} />
              ))}
            </div>
          </section>

          {!isAdmin && <VerificationCard user={user} />}

          <section className="card pf-card">
            <div className="pf-card-head">
              <h2>Appearance</h2>
            </div>
            <AppearancePicker />
          </section>
        </div>

        <aside className="pf-side">
          <section className="card pf-card">
            <div className="pf-card-head">
              <h2>{isAdmin ? "Platform at a glance" : "Your impact"}</h2>
            </div>
            {stats === null ? (
              <div className="pf-stats">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="pf-stat skeleton" style={{ minHeight: 86 }} />
                ))}
              </div>
            ) : stats.length === 0 ? (
              <p className="pf-muted">Stats are unavailable right now.</p>
            ) : (
              <div className="pf-stats">
                {stats.map((s) => (
                  <div key={s.label} className="pf-stat">
                    <span className="pf-stat-icon">{s.icon}</span>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {links.length > 0 && (
            <section className="card pf-card">
              <div className="pf-card-head">
                <h2>Quick links</h2>
              </div>
              <nav className="pf-links">
                {links.map(({ to, label, Icon }) => (
                  <Link key={to} to={to} className="pf-link">
                    <span className="pf-link-icon">
                      <Icon size={17} color="currentColor" />
                    </span>
                    {label}
                    <span className="pf-link-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}
              </nav>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
