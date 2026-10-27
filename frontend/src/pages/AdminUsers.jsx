import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, X, Mail, Phone, MapPin, Building2, CalendarDays, ShieldCheck, FileText, Copy, Check, ChevronRight, Users,
} from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import LottieState from "../components/LottieState.jsx";
import Pagination from "../components/Pagination.jsx";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { IconStatPeople, IconDonations, IconShieldCheck, IconInbox } from "../components/Icons.jsx";
import { avatarUrl } from "../avatar.js";
import { verificationStatusOf, REVIEWED_ROLES } from "../verification.js";
import "../styles/food-requests.css";
import "../styles/admin-users.css";

const PAGE_SIZE = 8;

const ROLE_TABS = [
  { key: "", label: "All" },
  { key: "donor", label: "Donors" },
  { key: "beneficiary", label: "Beneficiaries" },
  { key: "farm", label: "Farms" },
  { key: "admin", label: "Admins" },
];

const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
  { value: "active", label: "Active (admins)" },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
];

const ROLE_LABEL = { donor: "Donor", beneficiary: "Beneficiary", farm: "Farm", admin: "Admin" };

/** Same rule as the Verifications page - see verification.js. */
const statusOf = (u) => {
  const s = verificationStatusOf(u);
  return s === "approved" ? "verified" : s;
};
const NEEDS_REVIEW = REVIEWED_ROLES;

const STATUS_META = {
  verified: { label: "Verified", tone: "ok" },
  pending: { label: "Pending review", tone: "warn" },
  rejected: { label: "Rejected", tone: "danger" },
  active: { label: "Active", tone: "muted" },
};

/** Short absolute date - an account list is read by when, not how long ago. */
function joinedOn(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name = "") {
  return name.replace(/\./g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

function Avatar({ user, size = 40 }) {
  const url = avatarUrl(user);
  return (
    <span className={`au-avatar au-role-${user.role}`} style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials(user.name)}
    </span>
  );
}

function StatusPill({ user }) {
  const s = STATUS_META[statusOf(user)];
  return (
    <span className={`au-pill au-pill-${s.tone}`}>
      <i />
      {s.label}
    </span>
  );
}

function RoleChip({ role }) {
  return <span className={`au-role au-role-${role}`}>{ROLE_LABEL[role] || role}</span>;
}

function CopyButton({ value, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="au-copy"
      aria-label={`Copy ${label}`}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked - the value is still on screen */
        }
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/** Side panel with everything stored on one account. */
function UserDrawer({ user, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const status = statusOf(user);
  const docs = user.verificationDocuments?.length || 0;
  const rows = [
    { Icon: Mail, label: "Email", value: user.email, copy: true },
    { Icon: Phone, label: "Phone", value: user.phone },
    { Icon: Building2, label: "Organization", value: [user.organizationName, user.orgType].filter(Boolean).join(" · ") },
    { Icon: MapPin, label: "Location", value: user.location },
    { Icon: FileText, label: "Registration no.", value: user.registrationNumber },
    { Icon: CalendarDays, label: "Joined", value: joinedOn(user.createdAt) },
  ].filter((r) => r.value);

  const capacity = [
    user.organizationSize ? ["People served", user.organizationSize] : null,
    user.handlingCapacityKg ? ["Handling capacity", `${user.handlingCapacityKg} kg`] : null,
    user.storageTypes?.length ? ["Storage", user.storageTypes.join(", ")] : null,
    user.allocationsLast30Days ? ["Allocations (30 days)", user.allocationsLast30Days] : null,
  ].filter(Boolean);

  return (
    <div className="au-drawer-overlay" onClick={onClose}>
      <aside className="au-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${user.name} details`}>
        <div className="au-drawer-cover">
          <button type="button" className="au-drawer-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="au-drawer-id">
          <Avatar user={user} size={72} />
          <h3>{user.name}</h3>
          <div className="au-drawer-tags">
            <RoleChip role={user.role} />
            <StatusPill user={user} />
          </div>
        </div>

        <div className="au-drawer-body">
          <dl className="au-facts">
            {rows.map(({ Icon, label, value, copy }) => (
              <div key={label}>
                <dt><Icon size={14} /> {label}</dt>
                <dd>
                  <span title={value}>{value}</span>
                  {copy && <CopyButton value={value} label={label.toLowerCase()} />}
                </dd>
              </div>
            ))}
          </dl>

          {capacity.length > 0 && (
            <div className="au-capacity">
              {capacity.map(([k, v]) => (
                <div key={k}><strong>{v}</strong><span>{k}</span></div>
              ))}
            </div>
          )}

          {NEEDS_REVIEW.has(user.role) && (
            <div className={`au-verify au-verify-${status}`}>
              <ShieldCheck size={18} />
              <div>
                <strong>{STATUS_META[status].label}</strong>
                <span>
                  {docs} document{docs === 1 ? "" : "s"} uploaded
                  {user.verificationReviewedAt ? ` · reviewed ${joinedOn(user.verificationReviewedAt)}` : ""}
                </span>
                {status === "rejected" && user.rejectionReason && <em>“{user.rejectionReason}”</em>}
              </div>
            </div>
          )}
        </div>

        <div className="au-drawer-foot">
          <a href={`mailto:${user.email}`} className="btn btn-outline"><Mail size={15} /> Email</a>
          {NEEDS_REVIEW.has(user.role) && (
            <Link to="/admin/beneficiaries" className="btn btn-primary">
              <ShieldCheck size={15} /> {status === "pending" ? "Review now" : "Open verifications"}
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function AdminUsers() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // The whole directory is fetched once and filtered here, so the role tabs
  // can show counts and the status filter can use the same derived status
  // as the pills (the API's status filter reads the stale field).
  const { data, error, lastUpdated, isRefreshing, refresh } = useLiveData("/admin/users", { intervalMs: 20000 });
  const users = data?.users || [];
  const loading = !data && !error;

  const roleCounts = useMemo(() => {
    const c = { "": users.length };
    users.forEach((u) => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [users]);

  const orgs = users.filter((u) => NEEDS_REVIEW.has(u.role));
  const verifiedOrgs = orgs.filter((u) => statusOf(u) === "verified").length;
  const pendingOrgs = orgs.filter((u) => statusOf(u) === "pending").length;

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users
      .filter((u) => !role || u.role === role)
      .filter((u) => !status || statusOf(u) === status)
      .filter((u) => !q || [u.name, u.email, u.organizationName, u.location].filter(Boolean).some((f) => f.toLowerCase().includes(q)));
    const byDate = (a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    if (sort === "name") return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (sort === "oldest") return [...list].sort(byDate);
    return [...list].sort((a, b) => byDate(b, a));
  }, [users, role, status, query, sort]);

  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const visible = matched.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [role, status, query, sort]);

  const dash = (v) => (loading ? "—" : v);
  const filtersOn = role || status || query;

  return (
    <div className="dashboard-container">
      <div className="page-header au-header">
        <div>
          <h1 className="welcome-title">Users</h1>
          <p className="welcome-sub">Every account on the platform - search, filter and open any profile.</p>
        </div>
        <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconStatPeople size={26} color="var(--primary)" />}
          label="Total accounts"
          value={dash(users.length)}
          sub={`${roleCounts.admin || 0} admin${roleCounts.admin === 1 ? "" : "s"} included`}
        />
        <StatCard
          icon={<IconDonations size={26} color="var(--status-info-fg)" />}
          iconBg="var(--status-info-bg)"
          label="Donors"
          value={dash(roleCounts.donor || 0)}
          sub="Supermarkets, hotels & shops"
        />
        <StatCard
          icon={<IconShieldCheck size={26} color="var(--status-ok-fg)" />}
          label="Verified accounts"
          value={dash(verifiedOrgs)}
          sub={`of ${orgs.length} donors, NGOs & farms`}
        />
        <StatCard
          icon={<IconInbox size={26} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
          label="Awaiting review"
          value={dash(pendingOrgs)}
          sub={pendingOrgs ? "Open Verifications to review" : "No one waiting"}
        />
      </Stagger>

      <div className="card fr-panel au-panel">
        <div className="fr-toolbar">
          <div className="fr-tabs" role="tablist" aria-label="Filter by role">
            {ROLE_TABS.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                role="tab"
                aria-selected={role === t.key}
                className={`fr-tab${role === t.key ? " active" : ""}`}
                onClick={() => setRole(t.key)}
              >
                {t.label}
                <span className="fr-count">{dash(roleCounts[t.key] || 0)}</span>
              </button>
            ))}
          </div>
          <div className="fr-tools">
            <select className="fr-select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="fr-select" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="fr-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or organization"
                aria-label="Search users"
              />
            </label>
          </div>
        </div>

        {loading && <div className="au-state"><LottieState title="Loading accounts" message="Fetching the user directory…" size={110} /></div>}

        {data && matched.length === 0 && (
          <div className="au-state">
            <div className="au-empty-icon"><Users size={26} /></div>
            <strong>No matching users</strong>
            <p>{query ? `Nothing matches “${query}”. Try a different name, email or organization.` : "No accounts match these filters."}</p>
            {filtersOn && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setRole(""); setStatus(""); setQuery(""); }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {matched.length > 0 && (
          <>
            <div className="au-list" role="table" aria-label="Users">
              <div className="au-row au-row-head" role="row">
                <span role="columnheader">User</span>
                <span role="columnheader">Role</span>
                <span role="columnheader">Organization</span>
                <span role="columnheader">Joined</span>
                <span role="columnheader">Status</span>
                <span role="columnheader" className="sr-only">Open</span>
              </div>

              {visible.map((u) => (
                <button key={u.id} type="button" className="au-row au-item" role="row" onClick={() => setSelected(u)}>
                  <span className="au-user" role="cell">
                    <Avatar user={u} />
                    <span className="au-user-text">
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                    </span>
                  </span>
                  <span role="cell"><RoleChip role={u.role} /></span>
                  <span className="au-org" role="cell">
                    <strong>{u.organizationName || "—"}</strong>
                    {u.location && <span><MapPin size={11} /> {u.location}</span>}
                  </span>
                  <span className="au-joined" role="cell">{joinedOn(u.createdAt)}</span>
                  <span role="cell"><StatusPill user={u} /></span>
                  <span className="au-open" role="cell" aria-hidden="true"><ChevronRight size={16} /></span>
                </button>
              ))}
            </div>

            <div className="au-foot">
              <span>
                Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, matched.length)} of {matched.length}
                {matched.length !== users.length ? ` (filtered from ${users.length})` : ""}
              </span>
              <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
