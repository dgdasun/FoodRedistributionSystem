import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import StatCard from "../components/StatCard.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import VerificationUpload from "../components/VerificationUpload.jsx";
import BeneficiaryVerificationUpload from "../components/BeneficiaryVerificationUpload.jsx";
import VerificationApprovedBanner from "../components/VerificationApprovedBanner.jsx";
import LottieState from "../components/LottieState.jsx";
import { HorizontalBarChart, ProportionBar, StatusDonut, useChartPalette } from "../components/charts/ChartKit.jsx";
import { CountUp, FadeIn, GrowBar, Stagger, StaggerItem } from "../components/motion/Motion.jsx";
import { useLiveData } from "../hooks/useLiveData.js";
import LiveBadge from "../components/LiveBadge.jsx";
import ForecastSummaryCard from "../components/ForecastSummaryCard.jsx";
import AdminInsightsCard from "../components/AdminInsightsCard.jsx";
import Section from "../components/Section.jsx";
import { UNITS } from "../units.js";
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
  IconReport,
  IconSettings,
} from "../components/Icons.jsx";
import "../styles/admin-dashboard.css";

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
            Welcome back, {user.name}! <IconFloatingLeaf size={26} color="#85B840" />
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

      <VerificationApprovedBanner user={user} />

      {!user.verified && <VerificationUpload user={user} />}

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

      <Section title="Food forecast" hint="What may go unsold in the coming days.">
        <ForecastSummaryCard donorId={user.id} />
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
      <div className="page-header dashboard-hero">
        <h1 className="welcome-title">
          Welcome back, {user.name.split(" ")[0]}! <IconFloatingLeaf size={26} color="#85B840" />
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

      <VerificationApprovedBanner user={user} />

      {!user.verified &&
        (user.role === "beneficiary" ? <BeneficiaryVerificationUpload user={user} /> : <VerificationUpload user={user} />)}

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
/** Ranked list with rank, initials avatar, share of total and a growing bar. */
function RankedBarList({ data, unit = "kg" }) {
  const entries = Object.entries(data || {}).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) {
    return <LottieState title="Nothing ranked yet" message="Totals appear here once donations start moving." size={110} />;
  }
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <Stagger gap={0.06} className="ad-rank">
      {entries.map(([label, kg], i) => (
        <StaggerItem key={label} className="ad-rank-row">
          <span className={`ad-rank-no${i < 3 ? ` ad-rank-top${i + 1}` : ""}`}>{i + 1}</span>
          <span className="ad-rank-avatar" aria-hidden="true">
            {label.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </span>
          <div className="ad-rank-main">
            <div className="ad-rank-head">
              <span title={label}>{label}</span>
              <strong>
                <CountUp value={kg} decimals={Number.isInteger(kg) ? 0 : 1} /> {unit}
                <em>{Math.round((kg / total) * 100)}%</em>
              </strong>
            </div>
            <GrowBar percent={(kg / max) * 100} height={7} />
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const formatKg = (n) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10);
const fmt = (n) => formatKg(Number(n) || 0);

/** One headline tile in "All food listed to donate". */
function ListedTile({ unitKey, label, value, short, note }) {
  return (
    <div className={`ad-donated-stat ad-donated-${unitKey}`}>
      <span>{label}</span>
      <strong>
        <CountUp value={value} decimals={Number.isInteger(value) ? 0 : 1} /> <small>{short}</small>
      </strong>
      <em>{note}</em>
    </div>
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
  const categories = data.categoryBreakdown || {};
  const totalDonatedKg = Object.values(categories).reduce((a, b) => a + b, 0);
  const activeKg = Math.max(0, Math.round((totalDonatedKg - expiredKg) * 10) / 10);

  const pendingCount = data.requestStatusBreakdown?.pending || 0;
  const approvedCount = data.requestStatusBreakdown?.approved || 0;
  const rejectedCount = data.requestStatusBreakdown?.rejected || 0;

  // Status hues come from the validated reserved palette, never from the
  // categorical set - and every segment is labelled, which is what lets the
  // green/amber pair sit in the 6-8 CVD band legally. Read through the hook so
  // the segments repaint when the theme flips.
  const userStatuses = data.userStatusBreakdown || {};
  const userStatusSegments = [
    { key: "verified", label: "Verified", color: STATUS.good, value: userStatuses.verified || 0 },
    { key: "pending", label: "Pending review", color: STATUS.warning, value: userStatuses.pending || 0 },
    { key: "rejected", label: "Rejected", color: STATUS.critical, value: userStatuses.rejected || 0 },
    { key: "active", label: "Active (admins)", color: STATUS.neutral, value: userStatuses.active || 0 },
  ];
  const surplusSegments = [
    { key: "saved", label: "Saved", color: STATUS.good, value: savedKg },
    { key: "wasted", label: "Wasted", color: STATUS.critical, value: wastedKg },
  ];
  const expiredSegments = [
    { key: "active", label: "Rest of Donations", color: STATUS.good, value: activeKg },
    { key: "expired", label: "Expired", color: STATUS.warning, value: expiredKg },
  ];

  // Each row is a queue someone has to work through; empty queues still show,
  // so the admin can see at a glance that nothing is waiting.
  const attention = [
    { key: "verify", to: "/admin/beneficiaries", Icon: IconShieldCheck, count: data.pendingVerifications, label: "Organizations to verify", clear: "No organizations waiting", tone: "violet" },
    { key: "requests", to: "/admin/users?role=donor", Icon: IconInbox, count: data.pendingRequests, label: "Requests awaiting donors", clear: "No requests waiting", tone: "warn" },
    { key: "surplus", to: "/browse", Icon: IconFoodPlate, count: data.surplusItems, label: "Surplus listings live", clear: "No live surplus right now", tone: "info" },
    { key: "expired", to: "/browse?show=expired", Icon: IconTrashCan, count: data.expiredItems, label: "Expired, routed to farms", clear: "Nothing has expired", tone: "danger" },
  ];

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const totals = data.donatedTotals || {};

  return (
    <div className="dashboard-container ad-page">
      <section className="ad-hero">
        <svg className="ad-hero-art" viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <circle cx="540" cy="20" r="140" />
          <circle cx="410" cy="250" r="80" />
          <circle cx="620" cy="220" r="60" />
        </svg>

        <div className="ad-hero-top">
          <div>
            <span className="ad-eyebrow">Admin console · {today}</span>
            <h1>
              {greeting()}, {user.name} <IconFloatingLeaf size={24} color="#A9E05A" />
            </h1>
            <p>Here is how food is moving through the network right now.</p>
          </div>
          <LiveBadge lastUpdated={lastUpdated} isRefreshing={isRefreshing} error={error} onRefresh={refresh} />
        </div>

        <div className="ad-quick">
          <Link to="/admin/beneficiaries" className="ad-quick-btn primary">
            <IconShieldCheck size={16} color="currentColor" /> Review verifications
            {data.pendingVerifications > 0 && <span className="ad-quick-badge">{data.pendingVerifications}</span>}
          </Link>
          <Link to="/admin/users" className="ad-quick-btn">
            <IconStatPeople size={16} color="currentColor" /> Manage users
          </Link>
          <Link to="/admin/reports" className="ad-quick-btn">
            <IconReport size={16} color="currentColor" /> Generate report
          </Link>
          <Link to="/admin/settings" className="ad-quick-btn">
            <IconSettings size={16} color="currentColor" /> Expiry rules
          </Link>
        </div>
      </section>

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
          icon={<IconShieldCheck size={28} color="var(--status-violet-fg)" />}
          iconBg="var(--status-violet-bg)"
          label="Pending Verifications"
          value={data.pendingVerifications}
          sub={data.pendingVerifications ? "Awaiting review" : "All caught up"}
        />
        <StatCard
          icon={<IconFoodPlate size={28} color="var(--status-warn-fg)" />}
          iconBg="var(--status-warn-bg)"
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
          icon={<IconTicket size={28} color="var(--status-ok-fg)" />}
          label="Tickets Issued"
          value={data.totalTickets}
          sub={`${data.pendingRequests} requests pending`}
        />
      </Stagger>

      {/* Every listing since launch. The kg and liter totals include what is
          inside packets, so food listed as packets is never left out; kg and
          liters are still never added to each other. */}
      <Section title="All food listed to donate" hint="Everything donors have listed and made visible, packets included. Hidden listings are left out.">
        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconDonations size={17} color="currentColor" /></span> Total food listed to donate</h3>
            <span className="ad-chip">{totals.totalListings ?? 0} listings</span>
          </div>
          <div className="ad-donated">
            <ListedTile
              unitKey="kg"
              label="Kilograms (kg)"
              value={totals.totalWithPackets?.kg ?? 0}
              short="kg"
              note={`${fmt(totals.quantity?.kg)} kg loose · ${fmt(totals.packContents?.kg)} kg in packets`}
            />
            <ListedTile
              unitKey="liters"
              label="Liters (L)"
              value={totals.totalWithPackets?.liters ?? 0}
              short="L"
              note={`${fmt(totals.quantity?.liters)} L loose · ${fmt(totals.packContents?.liters)} L in packets`}
            />
            <ListedTile
              unitKey="items"
              label="Items / packets"
              value={totals.quantity?.items ?? 0}
              short="packets"
              note={
                `Holding ${fmt(totals.packContents?.kg)} kg + ${fmt(totals.packContents?.liters)} L` +
                (totals.packetsWithoutSize ? ` · ${totals.packetsWithoutSize} without a size` : "")
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Needs attention" hint="Queues across the platform.">
        <div className="card ad-attention">
          {attention.map(({ key, to, Icon, count, label, clear, tone }) => (
            <Link key={key} to={to} className={`ad-att-row${count ? ` ad-att-${tone}` : " ad-att-clear"}`}>
              <span className="ad-att-icon"><Icon size={18} color="currentColor" /></span>
              <span className="ad-att-text">
                <strong>{count ? label : clear}</strong>
                <span>{count ? "Open to review" : "All clear"}</span>
              </span>
              <span className="ad-att-count">{count || "✓"}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="AI insights" hint="What all donors are expected to produce, and whether NGOs can take it.">
        <AdminInsightsCard />
      </Section>

      <Section title="Distribution" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconLeafBullet size={17} color="currentColor" /></span> Most donated items</h3>
            <span className="ad-chip">Top {Object.keys(data.topItems || {}).length}</span>
          </div>
          {/* Horizontal: item names are long, and reading them straight across
              beats rotating them under a vertical axis. */}
          <HorizontalBarChart data={data.topItems} height={300} unit="kg" labelWidth={132} />
        </div>

        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconShieldCheck size={17} color="currentColor" /></span> User verification status</h3>
            <span className="ad-chip">{data.totalUsers} total</span>
          </div>
          <StatusDonut segments={userStatusSegments} unit="users" centerLabel="total users" />
        </div>
      </Section>

      {/* One chart per unit - a kilogram bar next to a liter bar would invite
          a comparison the numbers can't support. */}
      <Section title="Food by category" hint="Visible listings in each category, charted separately for kg, liters and packets.">
        <div className="ad-unit-charts">
          {UNITS.map((u) => {
            const series = totals.byCategory?.[u.key] || {};
            const n = Object.keys(series).length;
            const unitWord = u.key === "items" ? "packets" : u.short;
            return (
              <div key={u.key} className={`card ad-card ad-unit-chart ad-donated-${u.key}`}>
                <div className="ad-card-head">
                  <h3>{u.key === "items" ? "Packets / items" : u.label}</h3>
                  <span className="ad-chip">{n} categor{n === 1 ? "y" : "ies"}</span>
                </div>
                {n ? (
                  <HorizontalBarChart
                    data={series}
                    height={Math.max(160, n * 44)}
                    unit={unitWord}
                    labelWidth={112}
                  />
                ) : (
                  <p className="ad-unit-empty">Nothing listed in {unitWord} yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Network" className="grid-2 cards-row" style={{ marginBottom: 0 }}>
        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconDonations size={17} color="currentColor" /></span> Top donors</h3>
            <span className="ad-chip">kg donated</span>
          </div>
          <RankedBarList data={data.topDonors} />
        </div>

        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconCommunity size={17} color="currentColor" /></span> Top receiving organizations</h3>
            <span className="ad-chip">kg received</span>
          </div>
          <RankedBarList data={data.topOrganizations} />
        </div>
      </Section>

      {/* Both splits answer "where did the food end up", so they live in one
          card as two labelled rows instead of two half-empty ones. */}
      <Section title="Waste outcome">
        <div className="card ad-card">
          <div className="ad-card-head">
            <h3><span className="ad-card-icon"><IconTrashCan size={17} color="currentColor" /></span> Where the food ended up</h3>
          </div>

          <div className="ad-outcome">
            <div className="ad-outcome-stat ad-ok"><span>Saved (collected)</span><strong>{formatKg(savedKg)} kg</strong></div>
            <div className="ad-outcome-stat ad-warn"><span>Redirected to farms</span><strong>{formatKg(expiredKg)} kg</strong></div>
            <div className="ad-outcome-stat ad-danger"><span>Wasted (unclaimed)</span><strong>{formatKg(wastedKg)} kg</strong></div>
          </div>

          <div className="ad-outcome-bars">
            <div>
              <div className="ad-outcome-label">Surplus outcome</div>
              <ProportionBar segments={surplusSegments} unit="kg" emptyText="No surplus has been collected or written off yet." />
            </div>
            <div>
              <div className="ad-outcome-label">Expired share of all donations</div>
              <ProportionBar segments={expiredSegments} unit="kg" />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/**
 * The stored user is a snapshot from sign-in, so an admin's approval wouldn't
 * show until the next login. While an account awaits review, re-read it from
 * the server so the dashboard (and the approval banner) flips over on its own.
 */
function useVerificationRefresh(user, login) {
  const pending = !!user && user.role !== "admin" && !user.verified;
  const { data } = useLiveData(user ? `/auth/me/${user.id}` : "", { intervalMs: 30000, enabled: pending });
  const fresh = data?.user;

  useEffect(() => {
    if (!pending || !fresh) return;
    if (fresh.verified !== user.verified || fresh.verificationStatus !== user.verificationStatus) {
      login(fresh);
    }
  }, [fresh, pending, user, login]);
}

export default function Dashboard() {
  const { user, login } = useAuth();
  useVerificationRefresh(user, login);
  if (!user) return null;
  if (user.role === "donor") return <DonorDashboard user={user} />;
  if (user.role === "admin") return <AdminDashboard user={user} />;
  return <BeneficiaryDashboard user={user} />;
}
