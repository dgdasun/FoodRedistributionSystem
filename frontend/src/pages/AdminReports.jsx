import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange, Download, FileBarChart, Loader2, Search, RefreshCw, Sparkles, SlidersHorizontal } from "lucide-react";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import { Stagger } from "../components/motion/Motion.jsx";
import { CategoryBarChart, HorizontalBarChart, StatusDonut, useChartPalette } from "../components/charts/ChartKit.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  IconStatStore,
  IconStatBowl,
  IconStatPeople,
  IconTicket,
  IconInbox,
  IconCommunity,
  IconShieldCheck,
} from "../components/Icons.jsx";
import { imageFor } from "../foodImages.js";
import "../styles/food-requests.css";
import "../styles/admin-reports.css";

const pad = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const isoOf = (date) => toISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// The dates picked here are local calendar days; the server runs on UTC, so it
// needs the browser's zone to agree on what "today" is.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const reportQuery = (r) =>
  new URLSearchParams({ startDate: r.startDate, endDate: r.endDate, tz: TIME_ZONE }).toString();

function prettyDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function spanDays(r) {
  return Math.round((new Date(`${r.endDate}T00:00:00`) - new Date(`${r.startDate}T00:00:00`)) / 86400000) + 1;
}

/** Quick ranges. Each returns {startDate, endDate}; clamping to the 2-year window happens later. */
function buildPresets(today) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const back = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return isoOf(d);
  };
  const lastMonthY = m === 1 ? y - 1 : y;
  const lastMonth = m === 1 ? 12 : m - 1;
  return [
    { key: "today", label: "Today", range: { startDate: isoOf(today), endDate: isoOf(today) } },
    { key: "7d", label: "Last 7 days", range: { startDate: back(6), endDate: isoOf(today) } },
    { key: "month", label: "This month", range: { startDate: toISO(y, m, 1), endDate: isoOf(today) } },
    { key: "lastmonth", label: "Last month", range: { startDate: toISO(lastMonthY, lastMonth, 1), endDate: toISO(lastMonthY, lastMonth, daysInMonth(lastMonthY, lastMonth)) } },
    { key: "12m", label: "Last 12 months", range: { startDate: back(364), endDate: isoOf(today) } },
    { key: "year", label: "This year", range: { startDate: toISO(y, 1, 1), endDate: isoOf(today) } },
  ];
}

/** True below phone width; a 12-column chart's rotated labels collide there. */
function useNarrow(query = "(max-width: 640px)") {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}

const STATUS_TONE = { collected: "good", surplus: "warning", expired: "critical", reserved: "neutral", fresh: "neutral" };
const REQUEST_OUTCOME = {
  approved: { label: "Approved", tone: "good" },
  pending: { label: "Pending", tone: "warning" },
  rejected: { label: "Rejected", tone: "critical" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
const ROLE_LABEL = { donor: "Donor", beneficiary: "Beneficiary", farm: "Farm" };
const VERIFICATION_LABEL = { approved: "Verified", pending: "Awaiting review", rejected: "Rejected" };

export default function AdminReports() {
  const toast = useToast();
  const narrow = useNarrow();
  const { STATUS } = useChartPalette();
  const today = useMemo(() => new Date(), []);
  const todayISO = isoOf(today);
  const minISO = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 2);
    return isoOf(d);
  }, [today]);
  const presets = useMemo(() => buildPresets(today), [today]);

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = Number(minISO.slice(0, 4)); y <= today.getFullYear(); y++) opts.push(y);
    return opts.reverse();
  }, [minISO, today]);

  const [preset, setPreset] = useState("12m");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [report, setReport] = useState(null);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [recordQuery, setRecordQuery] = useState("");
  const [recordStatus, setRecordStatus] = useState("");
  const [memberRole, setMemberRole] = useState("");

  const monthOptions = useMemo(() => {
    if (!year) return [];
    const opts = [];
    for (let m = 1; m <= 12; m++) {
      if (toISO(year, m, daysInMonth(year, m)) >= minISO && toISO(year, m, 1) <= todayISO) opts.push(m);
    }
    return opts;
  }, [year, minISO, todayISO]);

  const dayOptions = useMemo(() => {
    if (!year || !month) return [];
    const opts = [];
    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const iso = toISO(year, month, d);
      if (iso >= minISO && iso <= todayISO) opts.push(d);
    }
    return opts;
  }, [year, month, minISO, todayISO]);

  const clamp = (r) => ({
    startDate: r.startDate < minISO ? minISO : r.startDate,
    endDate: r.endDate > todayISO ? todayISO : r.endDate,
  });

  const customRange = () => {
    if (!year) return null;
    if (day && month) return clamp({ startDate: toISO(year, month, day), endDate: toISO(year, month, day) });
    if (month) return clamp({ startDate: toISO(year, month, 1), endDate: toISO(year, month, daysInMonth(year, month)) });
    return clamp({ startDate: toISO(year, 1, 1), endDate: toISO(year, 12, 31) });
  };

  const run = async (r) => {
    if (!r) {
      setError("Pick a year to build a custom report.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/reports?${reportQuery(r)}`);
      setReport(data);
      setRange(r);
      setGeneratedAt(new Date());
      setRecordQuery("");
      setRecordStatus("");
      setMemberRole("");
    } catch (e) {
      setError(e.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // Open on the last 12 months so the page has something to read straight away.
  useEffect(() => {
    run(clamp(presets.find((p) => p.key === "12m").range));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPreset = (p) => {
    setPreset(p.key);
    run(clamp(p.range));
  };

  const downloadPdf = async () => {
    if (!range) return;
    setDownloading(true);
    try {
      await api.download(
        `/reports/pdf?${reportQuery(range)}`,
        `foodshare-report-${range.startDate}_to_${range.endDate}.pdf`
      );
      toast.success("PDF report downloaded.");
    } catch (e) {
      toast.error(e.message || "Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const s = report?.summary;
  const statusEntries = Object.entries(report?.statusBreakdown || {});
  const statusSegments = statusEntries.map(([key, value]) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    color: STATUS[STATUS_TONE[key] || "neutral"],
    value,
  }));
  const trendData = Object.fromEntries((report?.trend || []).map((t) => [t.label, t.quantityKg]));
  const trendTotal = (report?.trend || []).reduce((a, t) => a + t.quantityKg, 0);
  const peak = (report?.trend || []).reduce((best, t) => (t.quantityKg > (best?.quantityKg ?? -1) ? t : best), null);

  const records = useMemo(() => {
    const q = recordQuery.trim().toLowerCase();
    return (report?.donations || [])
      .filter((d) => !recordStatus || d.status === recordStatus)
      .filter((d) => !q || [d.name, d.category, d.pickupLocation].filter(Boolean).some((f) => f.toLowerCase().includes(q)));
  }, [report, recordQuery, recordStatus]);
  const visibleRecords = records.slice(0, 150);

  const members = report?.members || [];
  const visibleMembers = members.filter((m) => !memberRole || m.role === memberRole);
  const requestSegments = Object.entries(report?.requestOutcomes || {}).map(([key, value]) => ({
    key,
    label: REQUEST_OUTCOME[key]?.label || key,
    color: STATUS[REQUEST_OUTCOME[key]?.tone || "neutral"],
    value,
  }));

  return (
    <div className="dashboard-container">
      <div className="page-header rp-header">
        <div>
          <h1>Generate Reports</h1>
          <p>Pick a period from the last two years, review the numbers, then export the full report as a PDF.</p>
        </div>
      </div>

      {/* ---------- Period builder ---------- */}
      <section className="card rp-period">
        <div className="rp-period-head">
          <span className="rp-period-icon"><CalendarRange size={20} /></span>
          <div>
            <h3>Report period</h3>
            <p>Choose a quick range or build a custom one.</p>
          </div>
        </div>

        <div className="rp-presets" role="radiogroup" aria-label="Quick ranges">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={preset === p.key}
              className={preset === p.key ? "rp-preset active" : "rp-preset"}
              onClick={() => pickPreset(p)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={preset === "custom"}
            className={preset === "custom" ? "rp-preset active" : "rp-preset"}
            onClick={() => setPreset("custom")}
          >
            <SlidersHorizontal size={14} /> Custom
          </button>
        </div>

        {preset === "custom" && (
          <div className="rp-custom">
            <label>
              <span>Year</span>
              <select
                className="fr-select"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value ? Number(e.target.value) : "");
                  setMonth("");
                  setDay("");
                }}
              >
                <option value="">Select year</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>
              <span>Month</span>
              <select
                className="fr-select"
                value={month}
                disabled={!year}
                onChange={(e) => {
                  setMonth(e.target.value ? Number(e.target.value) : "");
                  setDay("");
                }}
              >
                <option value="">All months</option>
                {monthOptions.map((m) => <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>)}
              </select>
            </label>
            <label>
              <span>Day</span>
              <select className="fr-select" value={day} disabled={!month} onChange={(e) => setDay(e.target.value ? Number(e.target.value) : "")}>
                <option value="">All days</option>
                {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-primary rp-generate" onClick={() => run(customRange())} disabled={!year || loading}>
              {loading ? <Loader2 size={16} className="rp-spin" /> : <Sparkles size={16} />} Generate
            </button>
          </div>
        )}

        {error && <p className="rp-error">{error}</p>}
      </section>

      {!report && loading && <div className="card rp-loading"><Loader2 size={22} className="rp-spin" /> Building report…</div>}

      {report && (
        <div className={loading ? "rp-report rp-busy" : "rp-report"}>
          {/* ---------- Report cover ---------- */}
          <section className="rp-cover">
            <svg className="rp-cover-art" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
              <circle cx="560" cy="10" r="120" />
              <circle cx="430" cy="210" r="70" />
            </svg>
            <div className="rp-cover-main">
              <span className="rp-eyebrow"><FileBarChart size={13} /> Redistribution report</span>
              <h2>{prettyDate(range.startDate)}{range.startDate !== range.endDate ? ` – ${prettyDate(range.endDate)}` : ""}</h2>
              <p>
                {spanDays(range)} day{spanDays(range) === 1 ? "" : "s"} · grouped by {report.period.groupedBy}
                {generatedAt && ` · generated ${generatedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
              </p>
            </div>
            <div className="rp-cover-actions">
              <button type="button" className="rp-cover-btn" onClick={() => run(range)} disabled={loading} aria-label="Refresh report">
                <RefreshCw size={16} className={loading ? "rp-spin" : undefined} />
              </button>
              <button type="button" className="rp-cover-btn primary" onClick={downloadPdf} disabled={downloading}>
                {downloading ? <Loader2 size={16} className="rp-spin" /> : <Download size={16} />} Download PDF
              </button>
            </div>
          </section>

          <Stagger className="grid-4 stats-grid" key={`${range.startDate}-${range.endDate}`}>
            <StatCard icon={<IconStatStore size={28} color="var(--primary)" />} label="Donors joined" value={s.donorsJoined} sub="New donor accounts" />
            <StatCard icon={<IconCommunity size={28} color="var(--status-info-fg)" />} iconBg="var(--status-info-bg)" label="Beneficiaries joined" value={s.beneficiariesJoined} sub="New NGOs & charities" />
            <StatCard icon={<IconStatBowl size={28} color="var(--status-ok-fg)" />} label="Farms joined" value={s.farmsJoined} sub="New farm / compost partners" />
            <StatCard
              icon={<IconStatPeople size={28} color="var(--status-violet-fg)" />}
              iconBg="var(--status-violet-bg)"
              label="New members"
              value={s.membersJoined}
              sub="Donors, beneficiaries & farms"
            />
          </Stagger>

          <div className="rp-mini">
            <div><span className="rp-mini-icon"><IconInbox size={17} color="currentColor" /></span><strong>{s.totalRequests}</strong><span>Requests received</span></div>
            <div><span className="rp-mini-icon"><IconShieldCheck size={17} color="currentColor" /></span><strong>{s.requestApprovalRate == null ? "—" : `${s.requestApprovalRate}%`}</strong><span>Request approval rate</span></div>
            <div><span className="rp-mini-icon"><IconTicket size={17} color="currentColor" /></span><strong>{s.totalTickets}</strong><span>Pickup tickets issued</span></div>
          </div>

          {/* ---------- New members ---------- */}
          <section className="card rp-card">
            <div className="rp-card-head rp-records-head">
              <h3>New members joined <span className="rp-chip">{members.length}</span></h3>
              <div className="fr-tools">
                <select className="fr-select" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} aria-label="Filter members by role">
                  <option value="">All roles</option>
                  <option value="donor">Donors</option>
                  <option value="beneficiary">Beneficiaries</option>
                  <option value="farm">Farms</option>
                </select>
              </div>
            </div>

            {visibleMembers.length === 0 ? (
              <div className="rp-empty">
                {members.length ? "No members match this role." : "No donors, beneficiaries or farms joined in this period."}
              </div>
            ) : (
              <div className="rp-table-wrap">
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Location</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="rp-item">
                            <div>
                              <strong>{m.organizationName || m.name}</strong>
                              {m.organizationName && <span>{m.name}</span>}
                            </div>
                          </div>
                        </td>
                        <td>{ROLE_LABEL[m.role] || m.role}</td>
                        <td className="rp-muted">{prettyDate(m.joinedAt)}</td>
                        <td className="rp-muted rp-loc" title={m.location}>{m.location || "—"}</td>
                        <td><span className={`rp-status rp-status-${m.verificationStatus}`}><i />{VERIFICATION_LABEL[m.verificationStatus] || m.verificationStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card rp-card">
            <div className="rp-card-head">
              <h3>{report.period.groupedBy === "day" ? "Daily trend" : "Monthly trend"}</h3>
              <div className="rp-card-meta">
                <span className="rp-chip">{Math.round(trendTotal * 10) / 10} kg total</span>
                {peak && peak.quantityKg > 0 && <span className="rp-chip rp-chip-ok">Peak: {peak.label} · {peak.quantityKg} kg</span>}
              </div>
            </div>
            {trendTotal > 0 ? (
              narrow ? (
                <HorizontalBarChart data={trendData} height={Math.max(220, (report.trend || []).length * 30)} unit="kg" labelWidth={76} sorted={false} />
              ) : (
                <CategoryBarChart data={trendData} height={300} xLabel="Period" unit="kg" />
              )
            ) : (
              <div className="rp-empty">No donations were listed in this period.</div>
            )}
          </section>

          <div className="grid-2 cards-row">
            <section className="card rp-card">
              <div className="rp-card-head">
                <h3>Donations by category</h3>
                <span className="rp-chip">{Object.keys(report.categoryBreakdown || {}).length} categories</span>
              </div>
              {Object.keys(report.categoryBreakdown || {}).length ? (
                <HorizontalBarChart data={report.categoryBreakdown} height={280} unit="kg" labelWidth={120} />
              ) : (
                <div className="rp-empty">No donations recorded for this period.</div>
              )}
            </section>

            <section className="card rp-card">
              <div className="rp-card-head">
                <h3>Donation status</h3>
                <span className="rp-chip">{statusEntries.reduce((a, [, v]) => a + v, 0)} donations</span>
              </div>
              {statusSegments.length ? (
                <StatusDonut segments={statusSegments} unit="donations" centerLabel="donations" height={280} />
              ) : (
                <div className="rp-empty">No donations recorded for this period.</div>
              )}
            </section>
          </div>

          <div className="grid-2 cards-row">
            <section className="card rp-card">
              <div className="rp-card-head">
                <h3>Request outcomes</h3>
                <span className="rp-chip">{s.totalRequests} requests</span>
              </div>
              {s.totalRequests ? (
                <StatusDonut segments={requestSegments} unit="requests" centerLabel="requests" height={280} />
              ) : (
                <div className="rp-empty">No food requests were made in this period.</div>
              )}
            </section>

            <section className="card rp-card">
              <div className="rp-card-head">
                <h3>Top donors</h3>
                <span className="rp-chip">{s.activeDonors} active donor{s.activeDonors === 1 ? "" : "s"}</span>
              </div>
              {Object.keys(report.topDonors || {}).length ? (
                <HorizontalBarChart data={report.topDonors} height={280} unit="kg" labelWidth={140} />
              ) : (
                <div className="rp-empty">No donors listed food in this period.</div>
              )}
            </section>
          </div>

          {/* ---------- Records ---------- */}
          <section className="card rp-card">
            <div className="rp-card-head rp-records-head">
              <h3>Donation records <span className="rp-chip">{report.donations.length}</span></h3>
              <div className="fr-tools">
                <select className="fr-select" value={recordStatus} onChange={(e) => setRecordStatus(e.target.value)} aria-label="Filter records by status">
                  <option value="">Any status</option>
                  {statusEntries.map(([k]) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
                <label className="fr-search">
                  <Search size={16} />
                  <input type="search" placeholder="Search item, category or location" value={recordQuery} onChange={(e) => setRecordQuery(e.target.value)} />
                </label>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="rp-empty">{report.donations.length ? "No records match this search." : "No donation records for this period."}</div>
            ) : (
              <div className="rp-table-wrap">
                <table className="rp-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Date</th>
                      <th className="num">Qty</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div className="rp-item">
                            <img src={imageFor(d.category)} alt="" loading="lazy" />
                            <div>
                              <strong>{d.name}</strong>
                              <span>{d.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="rp-muted">{prettyDate(d.createdAt)}</td>
                        <td className="num"><strong>{d.quantityKg}</strong> kg</td>
                        <td><span className={`rp-status rp-status-${d.status}`}><i />{d.status}</span></td>
                        <td className="rp-muted rp-loc" title={d.pickupLocation}>{d.pickupLocation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {records.length > visibleRecords.length && (
              <p className="rp-note">Showing {visibleRecords.length} of {records.length} records - the full list is in the PDF export.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
