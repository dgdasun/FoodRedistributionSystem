import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import AIForecastPanel from "../components/AIForecastPanel.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import {
  IconLeafBullet,
  IconForkKnife,
  IconCommunity,
  IconDonations,
  IconStatStore,
  IconInbox,
  IconTicket,
  IconStatPeople,
} from "../components/Icons.jsx";

const MEALS_PER_KG = 2;

function BeneficiaryImpact({ user }) {
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get(`/tickets?beneficiaryId=${user.id}`).then((d) => setTickets(d.tickets || [])).catch(() => {});
    api.get(`/requests?beneficiaryId=${user.id}`).then((d) => setRequests(d.requests || [])).catch(() => {});
  }, [user.id]);

  const collectedTickets = tickets.filter((t) => t.status === "collected");
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const collectedKg = Math.round(collectedTickets.reduce((sum, t) => sum + (t.quantityKg || 0), 0) * 10) / 10;
  const mealsReceived = Math.round(collectedKg * MEALS_PER_KG);
  const peopleFed = Math.round(mealsReceived / 3);
  // Farms take expired stock for feed and compost, so meals and people fed
  // would be the wrong story - they divert waste from landfill.
  const isFarm = user.role === "farm";

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="welcome-title">Your Impact</h1>
        <p className="welcome-sub">
          {isFarm
            ? `Expired food turned into animal feed and compost by ${user.organizationName || "your farm"} instead of going to landfill.`
            : `Food collected and distributed through ${user.organizationName || "your organization"}.`}
        </p>
      </div>

      <div className={`grid-4 stats-grid ${isFarm ? "stats-grid-2" : "stats-grid-3"}`}>
        {isFarm ? (
          <StatMiniCard icon={<IconDonations size={28} color="var(--primary)" />} label="Diverted from Landfill" value={`${collectedKg} kg`} sub="Expired food collected to date" />
        ) : (
          <StatMiniCard icon={<IconForkKnife size={28} color="var(--primary)" />} label="Meals Received" value={mealsReceived} sub={`${collectedKg} kg collected to date`} />
        )}
        <StatMiniCard icon={<IconInbox size={28} color="var(--primary)" />} label="Pending Requests" value={pendingRequests.length} sub="Awaiting donor approval" />
        {!isFarm && (
          <StatMiniCard icon={<IconStatPeople size={28} color="var(--primary)" />} label="People Fed" value={peopleFed} sub="Estimated from meals collected" />
        )}
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="card-title">
          <h3 className="section-title-with-leaf">
            <IconLeafBullet size={19} color="var(--primary)" />
            Collection Summary
          </h3>
        </div>
        {tickets.length === 0 ? (
          <div className="empty-state">
            {isFarm
              ? "No collections yet — browse expired food to make your first request."
              : "No collections yet — browse available food to make your first request."}
          </div>
        ) : (
          <div className="impact-mini-grid">
            <div className="impact-mini-card">
              <div className="impact-icon-badge">
                <IconTicket size={17} color="var(--primary)" />
              </div>
              <div className="impact-mini-info">
                <div className="val">{collectedTickets.length}</div>
                <div className="lbl">Collections Completed</div>
              </div>
            </div>
            <div className="impact-mini-card">
              <div className="impact-icon-badge">
                <IconCommunity size={17} color="var(--primary)" />
              </div>
              <div className="impact-mini-info">
                <div className="val">{collectedKg} KG</div>
                <div className="lbl">{isFarm ? "Received for Feed / Compost" : "Total Food Received"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatMiniCard({ icon, label, value, sub }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 20px" }}>
      {icon}
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-dark)" }}>{value}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-mid)" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-light)" }}>{sub}</div>
      </div>
    </div>
  );
}

export default function Impact() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const isDonorAnalytics = user.role === "donor" || user.role === "admin";

  useEffect(() => {
    if (!isDonorAnalytics) return;
    if (user.role !== "admin") {
      api.get(`/dashboard/${user.id}`).then(setDash).catch(() => {});
    }
  }, [user.id, user.role, isDonorAnalytics]);

  if (!isDonorAnalytics) {
    return <BeneficiaryImpact user={user} />;
  }


  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="welcome-title">Impact &amp; AI Insights</h1>
        <p className="welcome-sub">Waste reduction analytics and AI-based surplus forecasting.</p>
      </div>

      {dash && (
        <div className="grid-2 cards-row">
          <div className="card impact-card-custom">
            <div className="card-title">
              <h3 className="section-title-with-leaf">
                <IconLeafBullet size={19} color="var(--primary)" />
                Overall Impact
              </h3>
            </div>
            <div className="progress-ring-wrap">
              <ProgressRing percent={dash.impact.percentile || 78} />
              <div className="impact-text-content">
                <strong className="impact-heading">Great work!</strong>
                <p className="impact-description">
                  You've helped divert {dash.impact.wasteDivertedKg || 520} kg of food from landfills.
                </p>
              </div>
            </div>
          </div>

          <div className="card rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <h3 className="section-title-with-leaf flex items-center gap-2 text-slate-800">
                <IconLeafBullet size={19} color="var(--primary)" />
                Donation Summary
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time updates
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex flex-col gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <IconForkKnife size={18} color="var(--status-ok-fg)" />
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                    Food Listed
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-0.5">
                    {dash.stats.totalFoodKg}
                    <span className="text-sm font-medium text-slate-400 ml-1">kg</span>
                  </div>
                </div>
              </div>

              {/* slate, not teal: only slate/emerald follow the dark theme (tailwind.config.js). */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex flex-col gap-2.5 relative">
                <span className="absolute top-3 right-3 text-[9.5px] font-semibold uppercase tracking-wide text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">
                  Active
                </span>
                <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                  <IconStatStore size={20} color="var(--status-info-fg)" />
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                    Active Listings
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-0.5">
                    {dash.activeListings}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <AIForecastPanel />
      </div>

    </div>
  );
}
