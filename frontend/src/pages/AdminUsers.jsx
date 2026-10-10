import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useLiveData } from "../hooks/useLiveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import LottieState from "../components/LottieState.jsx";
import Pagination from "../components/Pagination.jsx";
import { FadeIn, Stagger, StaggerItem } from "../components/motion/Motion.jsx";

const PAGE_SIZE = 8;

const ROLE_FILTERS = [
  { value: "", label: "All roles" },
  { value: "donor", label: "Donors" },
  { value: "beneficiary", label: "Beneficiaries" },
  { value: "farm", label: "Farms" },
  { value: "admin", label: "Admins" },
];

// The backend writes exactly these three values (see BeneficiaryService).
const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

/** Short absolute date - an account list is read by when, not how long ago. */
function joinedOn(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const ROLE_LABEL = {
  donor: "Donor",
  beneficiary: "Beneficiary",
  farm: "Farm",
  admin: "Admin",
};

/** Status pill - colour is paired with a word, never used on its own. */
function StatusPill({ user }) {
  const status = user.verificationStatus || (user.verified ? "approved" : "pending");
  const tone = {
    approved: { bg: "var(--primary-light)", fg: "var(--primary-dark)", dot: "var(--primary)" },
    pending: { bg: "var(--status-warn-bg)", fg: "var(--status-warn-fg)", dot: "var(--warning)" },
    rejected: { bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)", dot: "var(--danger)" },
  }[status] || { bg: "var(--primary-light)", fg: "var(--primary-dark)", dot: "var(--primary)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.dot }} />
      {status}
    </span>
  );
}

function FilterSelect({ value, onChange, options, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          padding: "7px 30px 7px 13px",
          borderRadius: 999,
          border: "1px solid var(--card-border)",
          background:
            "var(--white) url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4.5L6 8.5L10 4.5' stroke='%236B6355' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\") no-repeat right 11px center",
          color: "var(--text-mid)",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminUsers() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Role and status go into the URL, so changing them genuinely re-queries
  // MongoDB. Search stays client-side - refetching on every keystroke would
  // hammer the API for no benefit at this collection size.
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  const qs = params.toString();

  const { data, error, lastUpdated, isRefreshing, refresh } = useLiveData(
    `/admin/users${qs ? `?${qs}` : ""}`,
    { intervalMs: 20000 }
  );

  const users = data?.users || [];

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.organizationName, u.location]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const visible = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A filter change can leave you past the end of the shorter result set.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setPage(1);
  }, [role, status, query]);

  return (
    <div className="dashboard-container">
      <div
        className="page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <h1 className="welcome-title">Users</h1>
          <p className="welcome-sub">Every account in the system, straight from MongoDB.</p>
        </div>
        <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
      </div>

      <FadeIn>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Toolbar: search left, filters right. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "16px 18px",
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 340 }}>
              <Search
                size={15}
                color="var(--text-light)"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or organization"
                aria-label="Search users"
                style={{
                  width: "100%",
                  padding: "8px 32px 8px 34px",
                  borderRadius: 999,
                  border: "1px solid var(--card-border)",
                  background: "var(--white)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  color: "var(--text-dark)",
                  outline: "none",
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    padding: 2,
                  }}
                >
                  <X size={14} color="var(--text-light)" />
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <FilterSelect label="Filter by role" value={role} onChange={setRole} options={ROLE_FILTERS} />
              <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_FILTERS} />
            </div>
          </div>

          {!data && !error && (
            <div style={{ padding: 30 }}>
              <LottieState title="Loading accounts" message="Fetching the user directory…" size={110} />
            </div>
          )}

          {data && matched.length === 0 && (
            <div style={{ padding: 30 }}>
              <LottieState
                title="No matching users"
                message={
                  query
                    ? `Nothing matches “${query}”. Try a different name, email or organization.`
                    : "No accounts match these filters yet."
                }
                size={110}
              />
            </div>
          )}

          {matched.length > 0 && (
            <>
              {/* Desktop: a real table. */}
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Role</th>
                      <th scope="col">Organization</th>
                      <th scope="col">Joined</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: "var(--primary-light)",
                                color: "var(--primary-dark)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 12.5,
                                flexShrink: 0,
                              }}
                            >
                              {(u.avatar || u.name?.[0] || "?").toString().slice(0, 1)}
                            </span>
                            <strong style={{ fontWeight: 600 }}>{u.name}</strong>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-mid)" }}>{u.email}</td>
                        <td>{ROLE_LABEL[u.role] || u.role}</td>
                        <td style={{ color: "var(--text-mid)" }}>{u.organizationName || "—"}</td>
                        <td style={{ color: "var(--text-mid)", whiteSpace: "nowrap" }}>{joinedOn(u.createdAt)}</td>
                        <td>
                          <StatusPill user={u} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: the same rows as stacked cards - a 5-column table
                  cannot be read at 390px without horizontal scrolling. */}
              <Stagger className="admin-card-list" gap={0.05}>
                {visible.map((u) => (
                  <StaggerItem key={u.id} className="admin-user-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{u.name}</strong>
                        <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 2 }}>{u.email}</div>
                      </div>
                      <StatusPill user={u} />
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-light)", marginTop: 8 }}>
                      {ROLE_LABEL[u.role] || u.role}
                      {u.organizationName ? ` · ${u.organizationName}` : ""}
                      {` · joined ${joinedOn(u.createdAt)}`}
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "4px 18px 8px",
                  borderTop: "1px solid var(--card-border)",
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, matched.length)} of{" "}
                  {matched.length}
                  {matched.length !== users.length ? ` (filtered from ${users.length})` : ""}
                </span>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
