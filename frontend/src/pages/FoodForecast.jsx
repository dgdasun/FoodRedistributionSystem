import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  AlarmClock,
  CalendarDays,
  ChevronDown,
  Clock,
  CloudOff,
  HelpCircle,
  Lightbulb,
  PartyPopper,
  RefreshCw,
  Scale,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { ruleFor } from "../alertEngine.js";
import { useLiveData } from "../hooks/useLiveData.js";
import { useToast } from "../components/Toast.jsx";
import { SkeletonLine } from "../components/Skeleton.jsx";
import { CountUp, FadeIn, GrowBar, Stagger, StaggerItem, motion } from "../components/motion/Motion.jsx";
import {
  buildForecast,
  dayName,
  fmtHours,
  fmtLong,
  forecastSentence,
  isoLocal,
  Toggle,
  urgencyFor,
} from "../components/forecast/ForecastParts.jsx";
import { formatQty } from "../units.js";
import "../styles/forecast.css";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
];

const DAY_MS = 86_400_000;
const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
const kg = (v) => `${Math.round(v).toLocaleString()} kg`;

/**
 * Food Forecast for donors, in plain words.
 *
 * Two kinds of information sit on this page and are kept visibly apart:
 * "Expiring soon" is the donor's real stock (from /donations), while the
 * day cards and tips are estimates from the AI service (/ai/predict, this
 * donor's own history only) and carry an "AI estimate" label.
 */
export default function FoodForecast() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const forecastLive = useLiveData(`/ai/predict?daysAhead=${days}&donorId=${encodeURIComponent(user.id)}`, {
    intervalMs: 60000,
  });
  const stockLive = useLiveData(`/donations?donorId=${encodeURIComponent(user.id)}`, { intervalMs: 60000 });
  const { data: settingsData } = useLiveData("/settings", { intervalMs: 300000 });
  const settings = settingsData?.settings;

  const forecast = buildForecast(forecastLive.data?.daily);
  const forecastLoading = !forecastLive.data && !forecastLive.error;
  const forecastFailed = !!forecastLive.error && !forecastLive.data;

  return (
    <>
      <div className="page-header ff-header">
        <div>
          <h1>Food Forecast</h1>
          <p>What may go unsold in the coming days, and what to list first.</p>
        </div>
        <Toggle options={RANGES} value={days} onChange={setDays} label="How far ahead" />
      </div>

      <SummaryBanner
        forecast={forecast}
        days={days}
        loading={forecastLoading}
        failed={forecastFailed}
        onRetry={forecastLive.refresh}
      />

      <ExpiringSoon live={stockLive} />

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<CalendarDays size={18} />}
          title={`Next ${days === 7 ? "week" : `${days} days`} at a glance`}
          hint="How much food may be left over each day. Tap a day to see what it is made of."
          estimate
        />
        {forecastLoading ? (
          <div className="ff-days">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="card ff-day" aria-hidden="true">
                <SkeletonLine width="60%" height={12} style={{ marginBottom: 10 }} />
                <SkeletonLine width="70%" height={20} radius={999} style={{ marginBottom: 10 }} />
                <SkeletonLine width="50%" height={16} />
              </div>
            ))}
          </div>
        ) : forecastFailed ? (
          <ErrorCard onRetry={forecastLive.refresh} />
        ) : !forecast.rows.length ? (
          <NoHistoryCard />
        ) : (
          <DayCards forecast={forecast} />
        )}
      </FadeIn>

      <FadeIn as="section" className="ff-section">
        <SectionHead
          icon={<Lightbulb size={18} />}
          title="What you can do"
          hint="When to list each kind of food so NGOs still have time to collect it."
          estimate
        />
        {forecastLoading ? (
          <div className="ff-tips">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="card ff-tip" aria-hidden="true">
                <SkeletonLine width="40%" height={14} style={{ marginBottom: 10 }} />
                <SkeletonLine height={11} style={{ marginBottom: 6 }} />
                <SkeletonLine width="80%" height={11} />
              </div>
            ))}
          </div>
        ) : forecastFailed ? (
          <ErrorCard onRetry={forecastLive.refresh} />
        ) : forecast.rows.length ? (
          <Tips forecast={forecast} settings={settings} />
        ) : null}
      </FadeIn>

      <HowItWorks />
    </>
  );
}

function SectionHead({ icon, title, hint, estimate }) {
  return (
    <div className="ff-section-head">
      <div>
        <h2>
          <span className="ff-section-icon">{icon}</span>
          {title}
          {estimate && (
            <span className="ff-estimate" title="Estimated by the AI forecast, not your real stock">
              <Sparkles size={12} aria-hidden="true" /> AI estimate
            </span>
          )}
        </h2>
        {hint && <p>{hint}</p>}
      </div>
    </div>
  );
}

function ErrorCard({ onRetry, message = "We couldn't load the forecast just now. Please check your connection and try again." }) {
  return (
    <div className="card ff-state" role="alert">
      <CloudOff size={28} aria-hidden="true" />
      <p>{message}</p>
      <button type="button" className="btn btn-outline btn-sm ff-retry" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>
  );
}

function NoHistoryCard() {
  return (
    <div className="card ff-state">
      <Store size={28} aria-hidden="true" />
      <p>
        We don't have enough past records for your store yet. Once a few days of leftovers are recorded, your
        forecast will appear here.
      </p>
    </div>
  );
}

/* ---------- a) Summary banner ---------- */

function SummaryBanner({ forecast, days, loading, failed, onRetry }) {
  if (loading) {
    return (
      <div className="ff-banner" aria-busy="true">
        <SkeletonLine width="75%" height={20} style={{ marginBottom: 18 }} />
        <div className="ff-stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ff-stat" aria-hidden="true">
              <SkeletonLine width="50%" height={11} style={{ marginBottom: 8 }} />
              <SkeletonLine width="70%" height={20} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (failed) return <ErrorCard onRetry={onRetry} />;
  if (!forecast.rows.length) return null;

  const peak = forecast.dayTotals.reduce((a, b) => (b.kg > a.kg ? b : a));
  const top = forecast.rows[0];
  const stats = [
    {
      icon: <Scale size={18} />,
      label: `Expected leftovers, next ${days} days`,
      value: <><CountUp value={Math.round(forecast.total)} /> <small>kg</small></>,
    },
    {
      icon: <TrendingUp size={18} />,
      label: "Busiest day",
      value: dayName(peak.date),
      sub: `about ${kg(peak.kg)}`,
    },
    {
      icon: <Store size={18} />,
      label: "Most leftovers",
      value: top.category,
      sub: `about ${kg(top.total)}`,
    },
  ];

  return (
    <FadeIn className="ff-banner">
      <p className="ff-banner-text">
        <Sparkles size={18} aria-hidden="true" />
        <span>{forecastSentence(forecast, days)}</span>
      </p>
      <Stagger className="ff-stats">
        {stats.map((s) => (
          <StaggerItem key={s.label} className="ff-stat">
            <span className="ff-stat-label">
              {s.icon}
              {s.label}
            </span>
            <strong className="ff-stat-value">{s.value}</strong>
            {s.sub && <span className="ff-stat-sub">{s.sub}</span>}
          </StaggerItem>
        ))}
      </Stagger>
    </FadeIn>
  );
}

/* ---------- b) Expiring soon (real stock) ---------- */

/** Re-renders every minute so countdowns stay live without a refetch. */
function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Expiry dates carry no time of day, so food counts as good until the end of that day (same rule as alertEngine). */
const expiresAt = (iso) => new Date(`${iso}T23:59:59.999`);

function timeLeft(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} h` : ""} left`;
}

const GROUPS = [
  { key: "today", title: "Today", tone: "red", Icon: AlarmClock, empty: "Nothing expires today." },
  { key: "tomorrow", title: "Tomorrow", tone: "amber", Icon: Clock, empty: "Nothing expires tomorrow." },
  { key: "week", title: "This week", tone: "green", Icon: CalendarDays, empty: "Nothing else this week." },
];

function ExpiringSoon({ live }) {
  const now = useNow();
  const toast = useToast();
  const [publishing, setPublishing] = useState(null);
  const loading = !live.data && !live.error;

  const today = new Date(`${isoLocal(now)}T00:00:00`);
  const groups = { today: [], tomorrow: [], week: [] };
  for (const d of live.data?.donations || []) {
    // Only food still in the donor's hands: not expired, not already claimed or handed over.
    if (!d.expiryDate || ["expired", "collected", "reserved"].includes(d.status)) continue;
    // Fully requested away - nothing left to list.
    if (!(Number(d.quantityKg) > 0)) continue;
    const ms = expiresAt(d.expiryDate) - now;
    if (ms <= 0) continue;
    const ahead = Math.round((new Date(`${d.expiryDate}T00:00:00`) - today) / DAY_MS);
    const key = ahead === 0 ? "today" : ahead === 1 ? "tomorrow" : ahead <= 7 ? "week" : null;
    if (key) groups[key].push({ ...d, ms });
  }
  Object.values(groups).forEach((g) => g.sort((a, b) => a.ms - b.ms));
  const total = groups.today.length + groups.tomorrow.length + groups.week.length;

  const publish = async (item) => {
    setPublishing(item.id);
    try {
      await api.patch(`/donations/${item.id}`, { published: true });
      toast.success(`${item.name} is now live for NGOs.`);
      live.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPublishing(null);
    }
  };

  return (
    <FadeIn as="section" className="ff-section">
      <SectionHead
        icon={<AlarmClock size={18} />}
        title="Expiring soon"
        hint="Food from your own stock that is close to its expiry date. List it so NGOs can collect it in time."
      />
      {loading ? (
        <div className="ff-expiry">
          {GROUPS.map((g) => (
            <div key={g.key} className={`card ff-col ff-${g.tone}`} aria-hidden="true">
              <SkeletonLine width="40%" height={14} style={{ marginBottom: 14 }} />
              <SkeletonLine height={64} radius={12} style={{ marginBottom: 8 }} />
              <SkeletonLine height={64} radius={12} />
            </div>
          ))}
        </div>
      ) : live.error && !live.data ? (
        <ErrorCard onRetry={live.refresh} message="We couldn't load your stock just now. Please try again." />
      ) : total === 0 ? (
        <div className="card ff-state ff-state-good">
          <PartyPopper size={28} aria-hidden="true" />
          <p>Nothing in your stock expires in the next 7 days. Nice work!</p>
        </div>
      ) : (
        <div className="ff-expiry">
          {GROUPS.map((g) => (
            <div key={g.key} className={`card ff-col ff-${g.tone}`}>
              <h3 className="ff-col-head">
                <span className="ff-col-icon"><g.Icon size={16} aria-hidden="true" /></span>
                {g.title}
                <span className="ff-count">{groups[g.key].length}</span>
              </h3>
              {groups[g.key].length === 0 ? (
                <p className="ff-col-empty">{g.empty}</p>
              ) : (
                <ul className="ff-items">
                  {groups[g.key].map((item) => (
                    <li key={item.id} className="ff-item">
                      <div className="ff-item-main">
                        <strong>{item.name}</strong>
                        <span>
                          {formatQty(item.quantityKg, item)} · {item.category}
                        </span>
                      </div>
                      <div className="ff-item-side">
                        <span className="ff-countdown">
                          <Clock size={13} aria-hidden="true" />
                          {timeLeft(item.ms)}
                        </span>
                        {item.published ? (
                          <span className="ff-live">Live for NGOs</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm ff-list-btn"
                            onClick={() => publish(item)}
                            disabled={publishing === item.id}
                          >
                            {publishing === item.id ? "Listing…" : "List now"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </FadeIn>
  );
}

/* ---------- c) Day cards (estimate) ---------- */

/** Level is relative to the busiest day in view, so every week has its own Low / Medium / High. */
function levelFor(value, max) {
  const t = max > 0 ? value / max : 0;
  if (t >= 0.67) return { tone: "red", label: "High" };
  if (t >= 0.34) return { tone: "amber", label: "Medium" };
  return { tone: "green", label: "Low" };
}

function DayCards({ forecast }) {
  const [open, setOpen] = useState(null);
  const max = Math.max(...forecast.dayTotals.map((d) => d.kg));
  const openIndex = forecast.dates.indexOf(open);
  const breakdown =
    openIndex >= 0
      ? forecast.rows
          .map((r) => ({ category: r.category, kg: r.days[openIndex]?.quantityKg || 0 }))
          .sort((a, b) => b.kg - a.kg)
      : [];
  const breakdownMax = Math.max(...breakdown.map((b) => b.kg), 0.0001);

  return (
    <>
      <div className="ff-days" role="list">
        {forecast.dayTotals.map((d, i) => {
          const level = levelFor(d.kg, max);
          const isOpen = open === d.date;
          return (
            <motion.button
              key={d.date}
              type="button"
              role="listitem"
              className={`card ff-day${isOpen ? " open" : ""}`}
              aria-expanded={isOpen}
              aria-label={`${fmtLong(d.date)}: ${level.label}, about ${kg(d.kg)}. Show breakdown.`}
              onClick={() => setOpen(isOpen ? null : d.date)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <span className="ff-day-name">{weekday(d.date).slice(0, 3)}</span>
              <span className="ff-day-date">{new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className={`ff-level ff-level-${level.tone}`}>{level.label}</span>
              <strong className="ff-day-kg">{kg(d.kg)}</strong>
              <ChevronDown size={14} className="ff-day-chev" aria-hidden="true" />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {openIndex >= 0 && (
          <motion.div
            key={open}
            className="card ff-breakdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h3>{fmtLong(open)}: what may be left over</h3>
            <ul>
              {breakdown.map((b) => (
                <li key={b.category}>
                  <span className="ff-bd-name">{b.category}</span>
                  <div className="ff-bd-bar">
                    <GrowBar percent={(b.kg / breakdownMax) * 100} height={8} />
                  </div>
                  <span className="ff-bd-kg">{b.kg.toFixed(1)} kg</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- d) Tips (estimate) ---------- */

/**
 * Turns the category's near-expiry window (admin System Settings, the same
 * rule "Plan your listings" uses) into a day to act on. Food can be listed
 * once it is inside that window, so for a window of a day or more the advice
 * is to list it that many days before the busy day; for a window of hours,
 * the same morning.
 */
function tipFor(row, settings) {
  const rule = ruleFor(row.category, settings);
  const peakName = dayName(row.peak.date);
  const lead = `Most leftovers expected on ${peakName} (${kg(row.peak.quantityKg)}).`;
  if (rule.expiryThresholdHours < 24) {
    return `${lead} List it on ${peakName} morning; NGOs then have ${fmtHours(rule.collectionWindowHours)} to collect it.`;
  }
  const leadDays = Math.max(1, Math.round(rule.expiryThresholdHours / 24));
  const listDate = new Date(`${row.peak.date}T00:00:00`);
  listDate.setDate(listDate.getDate() - leadDays);
  const listIso = isoLocal(listDate);
  const when = listIso <= isoLocal(new Date()) ? "today" : `on ${dayName(listIso)} evening`;
  return `${lead} List it ${when} so NGOs can collect it by ${peakName}.`;
}

function Tips({ forecast, settings }) {
  return (
    <Stagger className="ff-tips">
      {forecast.rows.map((row) => {
        const rule = ruleFor(row.category, settings);
        const u = urgencyFor(rule.expiryThresholdHours);
        const tone = { urgent: "red", soon: "amber", calm: "green" }[u.tone];
        return (
          <StaggerItem key={row.category} className={`card ff-tip ff-tip-${tone}`}>
            <div className="ff-tip-head">
              <strong>{row.category}</strong>
              <span className={`ff-level ff-level-${tone}`}>
                <u.Icon size={12} aria-hidden="true" /> {u.label}
              </span>
            </div>
            <p>{tipFor(row, settings)}</p>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ---------- e) How it works ---------- */

function HowItWorks() {
  return (
    <FadeIn as="section" className="ff-section">
      <details className="card ff-how">
        <summary>
          <HelpCircle size={18} aria-hidden="true" />
          How does this work?
          <ChevronDown size={16} className="ff-how-chev" aria-hidden="true" />
        </summary>
        <div className="ff-how-body">
          <p>
            A computer program learned from 5 years of shop sales records. It looks at how much food you had left over
            in the past days and estimates the coming week.
          </p>
          <p>
            <strong>These are estimates, not guarantees.</strong> The "Expiring soon" list is different: it comes
            straight from the food you have added under My Donations.
          </p>
        </div>
      </details>
    </FadeIn>
  );
}
