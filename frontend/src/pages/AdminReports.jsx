import React, { useMemo, useState } from "react";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import {
  IconLeafBullet,
  IconStatStore,
  IconStatBowl,
  IconStatPeople,
  IconStatCO2,
  IconTicket,
  IconInbox,
  IconForkKnife,
  IconTrashCan,
} from "../components/Icons.jsx";

const STATUS_COLORS = {
  fresh: "#0369A1",
  surplus: "var(--status-warn-fg)",
  reserved: "var(--status-violet-fg)",
  expired: "var(--status-danger-fg)",
  collected: "var(--status-ok-fg)",
  unknown: "var(--stone)",
};

function pad(n) {
  return String(n).padStart(2, "0");
}
function toISO(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminReports() {
  const today = useMemo(() => new Date(), []);
  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const minDateObj = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 2);
    return d;
  }, [today]);
  const minISO = toISO(minDateObj.getFullYear(), minDateObj.getMonth() + 1, minDateObj.getDate());

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = minDateObj.getFullYear(); y <= today.getFullYear(); y++) opts.push(y);
    return opts;
  }, [minDateObj, today]);

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [report, setReport] = useState(null);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const monthOptions = useMemo(() => {
    if (!year) return [];
    const opts = [];
    for (let m = 1; m <= 12; m++) {
      const first = toISO(year, m, 1);
      const last = toISO(year, m, daysInMonth(year, m));
      if (last >= minISO && first <= todayISO) opts.push(m);
    }
    return opts;
  }, [year, minISO, todayISO]);

  const dayOptions = useMemo(() => {
    if (!year || !month) return [];
    const opts = [];
    const dim = daysInMonth(year, month);
    for (let d = 1; d <= dim; d++) {
      const iso = toISO(year, month, d);
      if (iso >= minISO && iso <= todayISO) opts.push(d);
    }
    return opts;
  }, [year, month, minISO, todayISO]);

  const computeRange = () => {
    if (!year) return null;
    let start, end;
    if (day && month) {
      start = end = toISO(year, month, day);
    } else if (month) {
      start = toISO(year, month, 1);
      end = toISO(year, month, daysInMonth(year, month));
    } else {
      start = toISO(year, 1, 1);
      end = toISO(year, 12, 31);
    }
    if (start < minISO) start = minISO;
    if (end > todayISO) end = todayISO;
    return { startDate: start, endDate: end };
  };

  const generate = async () => {
    const r = computeRange();
    if (!r) {
      setError("Select at least a year to generate a report.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/reports?startDate=${r.startDate}&endDate=${r.endDate}`);
      setReport(data);
      setRange(r);
    } catch (e) {
      setError(e.message || "Failed to generate report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!range) return;
    setDownloading(true);
    setError("");
    try {
      await api.download(
        `/reports/pdf?startDate=${range.startDate}&endDate=${range.endDate}`,
        `foodshare-report-${range.startDate}_to_${range.endDate}.pdf`
      );
    } catch (e) {
      setError(e.message || "Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const maxCategoryKg = report ? Math.max(...Object.values(report.categoryBreakdown || {}), 1) : 1;
  const maxTrendKg = report ? Math.max(...(report.trend || []).map((t) => t.quantityKg), 1) : 1;
  const totalStatusCount = report
    ? Object.values(report.statusBreakdown || {}).reduce((a, b) => a + b, 0)
    : 0;
  const visibleDonations = report ? (report.donations || []).slice(0, 150) : [];

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Generate Reports</h1>
        <p>Pick a year, month and day within the last two years to build a report — then export it as a PDF.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <h3 className="section-title-with-leaf">
            <IconLeafBullet size={19} color="var(--primary)" />
            Report Period
          </h3>
        </div>

        <div className="form-grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)", alignItems: "end" }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Year</label>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value ? Number(e.target.value) : "");
                setMonth("");
                setDay("");
              }}
            >
              <option value="">Select year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Month</label>
            <select
              value={month}
              disabled={!year}
              onChange={(e) => {
                setMonth(e.target.value ? Number(e.target.value) : "");
                setDay("");
              }}
            >
              <option value="">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label>Day</label>
            <select value={day} disabled={!month} onChange={(e) => setDay(e.target.value ? Number(e.target.value) : "")}>
              <option value="">All days</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={generate} disabled={!year || loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
          <button className="btn btn-outline" onClick={downloadPdf} disabled={!report || downloading}>
            {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
          {range && (
            <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
              Period: {range.startDate} to {range.endDate}
            </span>
          )}
        </div>
        {error && <div style={{ color: "var(--status-danger-fg)", fontSize: 13, marginTop: 10 }}>{error}</div>}
      </div>

      {!report && !loading && (
        <div className="card empty-state">Select a year (and optionally a month or day) above, then click Generate Report.</div>
      )}

      {report && (
        <>
          <div className="grid-4 stats-grid">
            <StatCard
              icon={<IconStatStore size={30} color="var(--primary)" />}
              label="Total Donations"
              value={report.summary.totalDonations}
              sub="Batches in this period"
            />
            <StatCard
              icon={<IconStatBowl size={30} color="var(--primary)" />}
              label="Total Food Donated"
              value={report.summary.totalQuantityKg}
              unit="KG"
              sub={`Equals ${Number(report.summary.mealsProvided).toLocaleString()} meals`}
            />
            <StatCard
              icon={<IconStatPeople size={30} color="var(--primary)" />}
              label="Beneficiaries Served"
              value={report.summary.beneficiariesServed}
              sub="Unique organizations"
            />
            <StatCard
              icon={<IconStatCO2 size={30} color="var(--primary)" />}
              label="CO₂ Saved"
              value={report.summary.co2SavedKg}
              unit="KG"
              sub="Environmental impact"
            />
          </div>

          <div className="grid-4 stats-grid">
            <StatCard
              icon={<IconTicket size={28} color="var(--primary)" />}
              label="Tickets Issued"
              value={report.summary.totalTickets}
              sub={`${report.summary.collectedKg} kg collected`}
            />
            <StatCard
              icon={<IconInbox size={28} color="var(--primary)" />}
              label="Requests Received"
              value={report.summary.totalRequests}
              sub="Beneficiary requests"
            />
            <StatCard
              icon={<IconForkKnife size={28} color="var(--primary)" />}
              label="Meals Provided"
              value={Number(report.summary.mealsProvided).toLocaleString()}
              sub="Estimated"
            />
            <StatCard
              icon={<IconTrashCan size={28} color="var(--primary)" />}
              label="Waste Diverted"
              value={report.summary.totalQuantityKg}
              unit="KG"
              sub="Kept out of landfill"
            />
          </div>

          <div className="grid-2 cards-row">
            <div className="card">
              <div className="card-title">
                <h3 className="section-title-with-leaf">
                  <IconLeafBullet size={19} color="var(--primary)" />
                  Donations by Category
                </h3>
              </div>
              {Object.entries(report.categoryBreakdown || {}).length === 0 && (
                <div className="empty-state">No donations recorded for this period.</div>
              )}
              {Object.entries(report.categoryBreakdown || {}).map(([cat, kg]) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{cat}</span>
                    <strong>{kg} kg</strong>
                  </div>
                  <div style={{ background: "var(--icon-chip)", borderRadius: 8, height: 9 }}>
                    <div
                      style={{
                        width: `${Math.max(2, (kg / maxCategoryKg) * 100)}%`,
                        background: "linear-gradient(90deg, #559805, #387E01)",
                        height: 9,
                        borderRadius: 8,
                        transition: "width .5s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">
                <h3 className="section-title-with-leaf">
                  <IconLeafBullet size={19} color="var(--primary)" />
                  Donation Status Breakdown
                </h3>
              </div>
              {totalStatusCount === 0 && <div className="empty-state">No donations recorded for this period.</div>}
              {Object.entries(report.statusBreakdown || {}).map(([status, count]) => {
                const pct = totalStatusCount ? Math.round((count / totalStatusCount) * 100) : 0;
                const color = STATUS_COLORS[status] || STATUS_COLORS.unknown;
                return (
                  <div key={status} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, textTransform: "capitalize" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
                        {status}
                      </span>
                      <strong>
                        {count} &bull; {pct}%
                      </strong>
                    </div>
                    <div style={{ background: "var(--surface-muted)", borderRadius: 8, height: 9 }}>
                      <div style={{ width: `${Math.max(2, pct)}%`, background: color, height: 9, borderRadius: 8, transition: "width .5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">
              <h3 className="section-title-with-leaf">
                <IconLeafBullet size={19} color="var(--primary)" />
                {report.period.groupedBy === "day" ? "Daily Trend (kg donated)" : "Monthly Trend (kg donated)"}
              </h3>
            </div>
            {(report.trend || []).length === 0 && <div className="empty-state">No trend data for this period.</div>}
            {(report.trend || []).length > 0 && (
              <div className="mini-bar-chart">
                {report.trend.map((t) => (
                  <div className="mini-bar-col" key={t.label} title={`${t.label}: ${t.quantityKg} kg · ${t.donations} donation(s)`}>
                    <div className="mini-bar-track">
                      <div
                        className="mini-bar-fill"
                        style={{ height: `${Math.max(2, (t.quantityKg / maxTrendKg) * 100)}%` }}
                      />
                    </div>
                    <span className="mini-bar-label">{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              <h3 className="section-title-with-leaf">
                <IconLeafBullet size={19} color="var(--primary)" />
                Donation Records ({report.donations.length})
              </h3>
            </div>
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty (kg)</th>
                    <th>Status</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDonations.map((d) => (
                    <tr key={d.id}>
                      <td>{d.createdAt}</td>
                      <td>{d.name}</td>
                      <td>{d.category}</td>
                      <td>{d.quantityKg}</td>
                      <td>
                        <span className={`badge-status ${d.status}`}>{d.status}</span>
                      </td>
                      <td>{d.pickupLocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.donations.length === 0 && <div className="empty-state">No donation records for this period.</div>}
              {report.donations.length > visibleDonations.length && (
                <p className="report-note">
                  Showing {visibleDonations.length} of {report.donations.length} records — the full list is included in the PDF export.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
