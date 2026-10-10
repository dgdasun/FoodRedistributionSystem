import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import VerificationUpload from "../components/VerificationUpload.jsx";
import LottieState from "../components/LottieState.jsx";
import { HorizontalBarChart, ProportionBar, StatusDonut, useChartPalette } from "../components/charts/ChartKit.jsx";
import { CountUp, FadeIn, GrowBar, Stagger, StaggerItem } from "../components/motion/Motion.jsx";
import { useLiveData } from "../hooks/useLiveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import AIForecastPanel from "../components/AIForecastPanel.jsx";
import Section from "../components/Section.jsx";
import {
  IconLeafBullet,
  IconFloatingLeaf,
  IconStatStore,
  IconStatBowl,
  IconStatPeople,
  IconForkKnife,
  IconTrashCan,
  IconCommunity,
  IconClock,
  GraphicEcoTruck,
  GraphicEarthSprout,
  IconImpact,
  IconDonations,
  IconFoodPlate,
  IconInbox,
  IconTicket,
  IconShieldCheck,
} from "../components/Icons.jsx";

const CATEGORY_IMAGE = {
  "Cooked Meals": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80",
  "Bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&auto=format&fit=crop&q=80",
  "Vegetables": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&auto=format&fit=crop&q=80",
  "Dairy": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=100&auto=format&fit=crop&q=80",
  "Fruits": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=100&auto=format&fit=crop&q=80",
  "Packaged Goods": "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=100&auto=format&fit=crop&q=80",
  "Other": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&auto=format&fit=crop&q=80",
};

/**
 * Builds a stat tile's sub-line from its parts, dropping the empty ones.
 *
 * The tiles used to hard-code two parts ("N donors · N beneficiaries"), which
 * silently omitted farms and admins - so the sub-line did not add up to the
 * number above it. Driving it off the full breakdown keeps the arithmetic
 * honest no matter which categories happen to be non-zero.
 *
 * Each entry is [count, singular, plural?]; plural defaults to singular + "s".
 */
function breakdown(parts) {
  return parts
    .filter(([n]) => Number(n) > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many ?? `${one}s`}`)
    .join(" · ");
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DonorDashboard({ user }) {
  const { data, error, lastUpdated, isRefreshing, refresh } = useLiveData(`/dashboard/${user.id}`);

  if (!data) return <div className="loading-wrap">Loading dashboard...</div>;
  const { stats, impact, recentDonations, nextPickup } = data;

  return (
    <div className="dashboard-container">
      {/* Top Header & Motivational Quote Card */}
      <div className="dashboard-top-row">
        <div className="page-header">
          <h1 className="welcome-title">
            Welcome back, {user.name}! <IconFloatingLeaf size={26} color="#8FBE63" />
          </h1>
          <p className="welcome-sub">Thank you for making a difference.</p>
          <div style={{ marginTop: 10 }}>
            <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
          </div>
        </div>

        <div className="quote-banner">
          <div className="quote-left">
            <div className="quote-sprout-icon">
              <IconImpact size={24} color="var(--primary)" />
            </div>
            <div className="quote-text">
              <strong>Together, we reduce waste</strong>
              <p>and feed those in need.</p>
            </div>
          </div>
          <div className="quote-graphic">
            <GraphicEarthSprout size={56} />
          </div>
        </div>
      </div>

      {!user.verified && user.verificationStatus === "rejected" ? (
        <div className="banner" style={{ background: "var(--status-danger-bg)", border: "1px solid var(--status-danger-border)", borderRadius: 14, padding: "14px 20px", marginBottom: 20 }}>
          <strong style={{ color: "var(--status-danger-fg)" }}>Verification rejected</strong>
          <p style={{ margin: "2px 0 0", color: "var(--status-danger-fg)", fontSize: 13.5 }}>
            {user.rejectionReason
              ? `Reason: ${user.rejectionReason}. Please upload a corrected document to request another review.`
              : "Please upload a corrected document to request another review."}
          </p>
          <VerificationUpload user={user} />
        </div>
      ) : (
        !user.verified && (
          <div className="banner" style={{ background: "var(--status-warn-bg)", border: "1px solid var(--status-warn-border)", borderRadius: 14, padding: "14px 20px", marginBottom: 20 }}>
            <strong style={{ color: "var(--status-warn-fg)" }}>Verification pending</strong>
            <p style={{ margin: "2px 0 0", color: "var(--status-warn-fg)", fontSize: 13.5 }}>
              An administrator is reviewing your organization. You can keep donating while you wait, but verified
              donors are shown as trusted partners to beneficiaries and admins.
            </p>
            <VerificationUpload user={user} />
          </div>
        )
      )}

      {/* Stat Cards */}
      <Stagger className="grid-4 stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard
          icon={<IconStatStore size={30} color="var(--primary)" />}
          label="Total Donations"
          value={stats.totalDonations}
          sub="Batches donated"
        />
        <StatCard
          icon={<IconStatBowl size={30} color="var(--primary)" />}
          label="Total Food Donated"
          value={stats.totalFoodKg}
          unit="KG"
          sub={`Equals ${stats.mealsEquivalent.toLocaleString()} meals`}
        />
        <StatCard
          icon={<IconStatPeople size={30} color="var(--primary)" />}
          label="People Helped"
          value={stats.peopleHelped}
          sub="Beneficiaries supported"
        />
      </Stagger>

      <Section title="Your impact" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        {/* Your Impact Card */}
        <div className="card impact-card-custom">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Your Impact
            </h3>
          </div>
          {stats.totalDonations === 0 ? (
            <div className="empty-state">
              <div className="emoji">🌱</div>
              Ready to make an impact? Post your first surplus donation to track meals provided and food rescued!
            </div>
          ) : (
            <>
              <div className="progress-ring-wrap">
                <ProgressRing percent={impact.percentile} />
                <div className="impact-text-content">
                  <strong className="impact-heading">You're a changemaker!</strong>
                  <p className="impact-description">
                    You've donated more than {impact.percentile}% of active donors.
                  </p>
                </div>
              </div>
              <div className="impact-mini-grid">
                <div className="impact-mini-card">
                  <div className="impact-icon-badge">
                    <IconForkKnife size={17} color="var(--primary)" />
                  </div>
                  <div className="impact-mini-info">
                    <div className="val">{impact.mealsProvided.toLocaleString()}</div>
                    <div className="lbl">Meals Provided</div>
                  </div>
                </div>
                <div className="impact-mini-card">
                  <div className="impact-icon-badge">
                    <IconTrashCan size={17} color="var(--primary)" />
                  </div>
                  <div className="impact-mini-info">
                    <div className="val">{impact.wasteDivertedKg} KG</div>
                    <div className="lbl">Waste Diverted</div>
                  </div>
                </div>
                <div className="impact-mini-card">
                  <div className="impact-icon-badge">
                    <IconCommunity size={17} color="var(--primary)" />
                  </div>
                  <div className="impact-mini-info">
                    <div className="val">{impact.communitiesHelped}</div>
                    <div className="lbl">Communities Helped</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Donations Card */}
        <div className="card donations-card-custom">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Recent Donations
            </h3>
            <a className="view-all-link" href="/donations">
              View All &gt;
            </a>
          </div>
          <div className="donations-list">
            {recentDonations.length === 0 && (
            <LottieState title="No donations yet" message="Your most recent listings will show up here." size={120} />
          )}
            {recentDonations.slice(0, 3).map((d) => (
              <div className="donation-row-styled" key={d.id}>
                <div className="donation-thumb-img-wrap">
                  <img
                    src={CATEGORY_IMAGE[d.category] || CATEGORY_IMAGE[d.name] || CATEGORY_IMAGE["Other"]}
                    alt={d.name}
                    className="donation-thumb-img"
                  />
                </div>
                <div className="donation-info-styled">
                  <strong className="donation-name">{d.name}</strong>
                  <span className="donation-meta-text">
                    {d.quantityKg} KG &bull; {d.pickupLocation || "Pickup location TBD"}
                  </span>
                  <span className="donation-date-text">
                    {new Date(d.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <span className="badge-completed">COMPLETED</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="Coming up"
        className="grid-2 cards-row"
        style={{ marginBottom: 0 }}
        innerStyle={{ gridTemplateColumns: "1fr" }}
      >
        {/* Your Next Pickup */}
        <div className="card next-pickup-card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Your Next Pickup
            </h3>
          </div>
          {nextPickup ? (
            <div className="next-pickup-body">
              <div className="next-pickup-left">
                <div className="calendar-badge">
                  <div className="cal-month">{MONTHS[new Date(nextPickup.date).getMonth()]}</div>
                  <div className="cal-day">{new Date(nextPickup.date).getDate()}</div>
                  <div className="cal-dow">
                    {new Date(nextPickup.date).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                  </div>
                </div>
                <div className="pickup-details-col">
                  <strong className="pickup-location-title">{nextPickup.pickupLocation}</strong>
                  <p className="pickup-item-name">{nextPickup.itemName}</p>
                  <div className="pickup-meta-row">
                    <span className="pickup-meta-item">
                      <IconClock size={15} color="var(--primary)" />
                      {nextPickup.pickupTime} &bull; {nextPickup.quantityKg} KG
                    </span>
                  </div>
                </div>
              </div>
              <div className="next-pickup-graphic">
                <GraphicEcoTruck />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="emoji">📅</div>
              No upcoming pickups scheduled. When a request is accepted, your next collection time will appear here.
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function BeneficiaryDashboard({ user }) {
  const live = useLiveData(`/donations?published=true`);
  const ticketsLive = useLiveData(`/tickets?beneficiaryId=${user.id}`);
  const requestsLive = useLiveData(`/requests?beneficiaryId=${user.id}`);

  const items = live.data?.donations || [];
  const tickets = ticketsLive.data?.tickets || [];
  const requests = requestsLive.data?.requests || [];

  const available = items.filter((i) => (user.role === "farm" ? i.status === "expired" : i.status !== "expired"));
  const pendingTickets = tickets.filter((t) => t.status === "pending");

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1 className="welcome-title">
          Welcome back, {user.name.split(" ")[0]}! <IconFloatingLeaf size={26} color="#8FBE63" />
        </h1>
        <p className="welcome-sub">{user.organizationName}</p>
        <div style={{ marginTop: 10 }}>
          <LiveBadge
            lastUpdated={live.lastUpdated}
            isRefreshing={live.isRefreshing || ticketsLive.isRefreshing || requestsLive.isRefreshing}
            error={live.error}
            onRefresh={() => {
              live.refresh();
              ticketsLive.refresh();
              requestsLive.refresh();
            }}
          />
        </div>
      </div>

      {!user.verified && user.verificationStatus === "rejected" ? (
        <div className="banner" style={{ background: "var(--status-danger-bg)", border: "1px solid var(--status-danger-border)", borderRadius: 14, padding: "14px 20px", marginBottom: 20 }}>
          <strong style={{ color: "var(--status-danger-fg)" }}>Verification rejected</strong>
          <p style={{ margin: "2px 0 0", color: "var(--status-danger-fg)", fontSize: 13.5 }}>
            {user.rejectionReason
              ? `Reason: ${user.rejectionReason}. Please upload a corrected document to request another review.`
              : "Please upload a corrected document to request another review."}
          </p>
          <VerificationUpload user={user} />
        </div>
      ) : (
        !user.verified && (
          <div className="banner" style={{ background: "var(--status-warn-bg)", border: "1px solid var(--status-warn-border)", borderRadius: 14, padding: "14px 20px", marginBottom: 20 }}>
            <strong style={{ color: "var(--status-warn-fg)" }}>Verification pending</strong>
            <p style={{ margin: "2px 0 0", color: "var(--status-warn-fg)", fontSize: 13.5 }}>
              An administrator is reviewing your organization. You can browse available food, but you'll need to be
              verified before you can request or receive it.
            </p>
            <VerificationUpload user={user} />
          </div>
        )
      )}

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconFoodPlate size={28} color="var(--primary)" />}
          label="Available Listings"
          value={available.length}
          sub={user.role === "farm" ? "Expired items nearby" : "Surplus items nearby"}
        />
        <StatCard
          icon={<IconInbox size={28} color="var(--primary)" />}
          label="Your Requests"
          value={requests.length}
          sub={`${requests.filter((r) => r.status === "pending").length} pending`}
        />
        <StatCard
          icon={<IconTicket size={28} color="var(--primary)" />}
          label="Active Tickets"
          value={pendingTickets.length}
          sub="Awaiting collection"
        />
        <StatCard
          icon={<IconStatPeople size={28} color="var(--primary)" />}
          label="Org Capacity"
          value={user.handlingCapacityKg || 0}
          unit="KG"
          sub="Handling capacity"
        />
      </Stagger>

      <Section title="Activity" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Newest Listings
            </h3>
            <a className="view-all-link" href="/browse">
              Browse All &gt;
            </a>
          </div>
          {available.slice(0, 5).map((d) => (
            <div className="donation-row-styled" key={d.id}>
              <div className="donation-thumb-img-wrap">
                <img
                  src={CATEGORY_IMAGE[d.category] || CATEGORY_IMAGE["Other"]}
                  alt={d.name}
                  className="donation-thumb-img"
                />
              </div>
              <div className="donation-info-styled">
                <strong className="donation-name">{d.name}</strong>
                <span className="donation-meta-text">
                  {d.quantityKg} KG &bull; {d.pickupLocation}
                </span>
              </div>
              <span className={`badge-status ${d.status}`}>{d.status}</span>
            </div>
          ))}
          {available.length === 0 && (
            <LottieState title="No listings right now" message="New surplus nearby will appear here as soon as a donor posts it." size={120} />
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Upcoming Collections
            </h3>
            <a className="view-all-link" href="/tickets">
              View All &gt;
            </a>
          </div>
          {pendingTickets.slice(0, 5).map((t) => (
            <div className="donation-row-styled" key={t.id}>
              <div className="donation-thumb-img-wrap" style={{ background: "var(--icon-chip)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconTicket size={24} color="var(--primary)" />
              </div>
              <div className="donation-info-styled">
                <strong className="donation-name">{t.item?.name || "Surplus Collection"}</strong>
                <span className="donation-meta-text">
                  {t.quantityKg} KG &bull; {t.pickupDate} at {t.pickupTime}
                </span>
              </div>
              <span className="badge-status pending">{t.status}</span>
            </div>
          ))}
          {pendingTickets.length === 0 && (
            <LottieState title="No collections booked" message="Browse available food and request a pickup to get your first ticket." size={120} />
          )}
        </div>
      </Section>
    </div>
  );
}

/** Ranked list of totals - one hue, since the name beside each bar carries identity. */
function RankedBarList({ data }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) {
    return <LottieState title="Nothing ranked yet" message="Totals appear here once donations start moving." size={110} />;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <Stagger gap={0.06}>
      {entries.map(([label, kg]) => (
        <StaggerItem key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 6 }}>
            <span style={{ fontWeight: 500 }}>{label}</span>
            <strong>
              <CountUp value={kg} decimals={Number.isInteger(kg) ? 0 : 1} /> kg
            </strong>
          </div>
          <GrowBar percent={(kg / max) * 100} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function AdminDashboard({ user }) {
  const { data, error, lastUpdated, isRefreshing, refresh } = useLiveData("/dashboard/admin/overview");
  // Above the early return - hooks can't sit behind a conditional.
  const { STATUS } = useChartPalette();
  if (!data) return <div className="loading-wrap">Loading dashboard...</div>;

  const foodOutcome = data.foodOutcome || {};
  const savedKg = foodOutcome["Saved (Collected)"] || 0;
  const wastedKg = foodOutcome["Wasted (Unclaimed Surplus)"] || 0;
  const expiredKg = foodOutcome["Expired (Redirected to Compost/Farms)"] || 0;
  const totalDonatedKg = Object.values(data.categoryBreakdown || {}).reduce((a, b) => a + b, 0);
  const activeKg = Math.max(0, Math.round((totalDonatedKg - expiredKg) * 10) / 10);

  const pendingCount = data.requestStatusBreakdown?.pending || 0;
  const approvedCount = data.requestStatusBreakdown?.approved || 0;
  const rejectedCount = data.requestStatusBreakdown?.rejected || 0;

  // Status hues come from the validated reserved palette, never from the
  // categorical set - and every segment is labelled, which is what lets the
  // green/amber pair sit in the 6-8 CVD band legally. Read through the hook so
  // the segments repaint when the theme flips.
  const approvalSegments = [
    { key: "approved", label: "Approved", color: STATUS.good, value: approvedCount },
    { key: "pending", label: "Pending Approval", color: STATUS.warning, value: pendingCount },
    { key: "rejected", label: "Rejected", color: STATUS.critical, value: rejectedCount },
  ];
  const surplusSegments = [
    { key: "saved", label: "Saved", color: STATUS.good, value: savedKg },
    { key: "wasted", label: "Wasted", color: STATUS.critical, value: wastedKg },
  ];
  const expiredSegments = [
    { key: "active", label: "Rest of Donations", color: STATUS.good, value: activeKg },
    { key: "expired", label: "Expired", color: STATUS.warning, value: expiredKg },
  ];

  return (
    <div className="dashboard-container">
      {/* Toolbar: identity on the left, system state on the right. One live
          badge for the whole page - the panels below no longer each carry one. */}
      <div
        className="page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <h1 className="welcome-title">
            System Overview <IconFloatingLeaf size={26} color="#8FBE63" />
          </h1>
          <p className="welcome-sub">Welcome back, {user.name}.</p>
        </div>
        <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
      </div>

      <Stagger className="grid-4 stats-grid">
        <StatCard
          icon={<IconStatPeople size={28} color="var(--primary)" />}
          label="Total Users"
          value={data.totalUsers}
          sub={breakdown([
            [data.totalDonors, "donor"],
            [data.totalBeneficiaries, "beneficiary", "beneficiaries"],
            [data.totalFarms, "farm"],
            [data.totalAdmins, "admin"],
          ])}
        />
        <StatCard
          icon={<IconShieldCheck size={28} color="var(--primary)" />}
          label="Pending Verifications"
          value={data.pendingVerifications}
          sub="Awaiting review"
        />
        <StatCard
          icon={<IconFoodPlate size={28} color="var(--primary)" />}
          label="Active Listings"
          value={data.totalListings}
          sub={breakdown([
            [data.surplusItems, "surplus", "surplus"],
            [data.expiredItems, "expired", "expired"],
            [data.reservedItems, "reserved", "reserved"],
            [data.collectedItems, "collected", "collected"],
          ])}
        />
        <StatCard
          icon={<IconTicket size={28} color="var(--primary)" />}
          label="Tickets Issued"
          value={data.totalTickets}
          sub={`${data.pendingRequests} requests pending`}
        />
      </Stagger>

      <Section title="Forecast" hint="What the model expects to come through next.">
        <AIForecastPanel showLive={false} />
      </Section>

      <Section title="Distribution" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconLeafBullet size={19} color="var(--primary)" />
              Most Donated Items
            </h3>
          </div>
          {/* Horizontal: item names are long, and reading them straight across
              beats rotating them under a vertical axis. */}
          <HorizontalBarChart data={data.topItems} height={300} unit="kg" labelWidth={132} />
        </div>

        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconShieldCheck size={19} color="var(--primary)" />
              Request Approval Status
            </h3>
          </div>
          <StatusDonut segments={approvalSegments} unit="requests" centerLabel="total requests" />
        </div>
      </Section>

      <Section title="Network" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconDonations size={19} color="var(--primary)" />
              Top Donors (kg Donated)
            </h3>
          </div>
          <RankedBarList data={data.topDonors} />
        </div>

        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconCommunity size={19} color="var(--primary)" />
              Top Receiving Organizations (kg)
            </h3>
          </div>
          <RankedBarList data={data.topOrganizations} />
        </div>
      </Section>

      {/* Both splits answer "where did the food end up", so they live in one
          card as two labelled rows instead of two half-empty ones. */}
      <Section title="Waste outcome">
        <div className="card">
          <div className="card-title">
            <h3 className="section-title-with-leaf">
              <IconTrashCan size={19} color="var(--primary)" />
              Where the food ended up
            </h3>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 8 }}>
              Surplus outcome
            </div>
            <ProportionBar
              segments={surplusSegments}
              unit="kg"
              emptyText="No surplus has been collected or written off yet."
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-mid)", marginBottom: 8 }}>
              Expired share of all donations
            </div>
            <ProportionBar segments={expiredSegments} unit="kg" />
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "donor") return <DonorDashboard user={user} />;
  if (user.role === "admin") return <AdminDashboard user={user} />;
  return <BeneficiaryDashboard user={user} />;
}
