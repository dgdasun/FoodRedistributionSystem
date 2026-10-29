import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "../components/Reveal.jsx";
import Chatbot from "../components/Chatbot.jsx";
import Footer from "../components/Footer.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { freshnessOf } from "../components/FreshnessMeter.jsx";
import { api } from "../api.js";
import { CATEGORY_IMAGE, imageFor } from "../foodImages.js";
import {
  BrandWordmark,
  IconImpact,
  IconInbox,
  IconFoodPlate,
  IconShieldCheck,
  IconScan,
  IconStatStore,
  IconStatBowl,
  IconStatPeople,
  IconStatCO2,
  IconStepStore,
  IconStepCollect,
  IconStepDistribute,
  IconStepHeart,
  IconFloatingLeaf,
  IconMapPin,
  IconPackageBox,
} from "../components/Icons.jsx";

const FEATURES = [
  {
    Icon: IconImpact,
    title: "AI Priority Matching",
    text: "A transparent, auditable scoring model ranks beneficiary requests by urgency, distance, capacity and allocation history — no black box.",
  },
  {
    Icon: IconStatCO2,
    title: "Surplus Forecasting",
    text: "A scikit-learn model predicts next week's surplus per category from historical inventory, so donors and NGOs can plan ahead.",
  },
  {
    Icon: IconScan,
    title: "QR Pickup Confirmation",
    text: "Every approved handoff gets a unique pickup ticket — scanned or entered manually to confirm collection in seconds.",
  },
  {
    Icon: IconInbox,
    title: "Real-Time Requests",
    text: "Beneficiaries and farm partners submit requests the moment surplus is published; donors accept or decline instantly.",
  },
  {
    Icon: IconShieldCheck,
    title: "Verified Network",
    text: "NGOs, charities and farms are verified by an admin before they can request food — keeping the network trustworthy.",
  },
  {
    Icon: IconFoodPlate,
    title: "Role-Based Dashboards",
    text: "Donors, beneficiaries, farms and admins each get a dashboard tailored to exactly what they need to act on.",
  },
];

const STEPS = [
  { Icon: IconStepStore, label: "Donor lists surplus food before it goes to waste" },
  { Icon: IconStepDistribute, label: "Beneficiary or farm partner requests and is approved" },
  { Icon: IconStepCollect, label: "AI ranks and matches it to the right beneficiary" },
  { Icon: IconStepHeart, label: "Pickup is confirmed by QR — impact tracked automatically" },
];

const ROLES = [
  { Icon: IconStatStore, title: "Donors", text: "Supermarkets & restaurants publishing surplus before it expires." },
  { Icon: IconStatPeople, title: "Beneficiaries", text: "NGOs and charities requesting food for the communities they serve." },
  { Icon: IconStatBowl, title: "Farms & Compost", text: "Diverting what can't be eaten into feed or compost instead of landfill." },
  { Icon: IconShieldCheck, title: "Admins", text: "Verifying organizations and monitoring the network's overall impact." },
];

const STATS = [
  { Icon: IconStatStore, value: "500+", label: "kg redistributed" },
  { Icon: IconStatBowl, value: "1,000+", label: "meals provided" },
  { Icon: IconStatPeople, value: "5+", label: "communities helped" },
];

const CATEGORIES = Object.keys(CATEGORY_IMAGE).filter((c) => c !== "Other");

/**
 * A short live strip of what is on offer right now, read from the same public
 * listing the Browse page uses. It renders nothing until there is something
 * real to show, so the landing page never displays placeholder food.
 */
function FreshListings() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api
      .get("/donations?published=true")
      .then((d) => setItems((d.donations || []).filter((i) => i.status !== "expired").slice(0, 4)))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="home-section home-fresh">
      <Reveal className="home-section-head home-section-head-row">
        <div>
          <span className="home-kicker">Live right now</span>
          <h2 className="home-section-title">Fresh surplus, ready for pickup</h2>
        </div>
        <Link to="/browse" className="home-link-arrow">
          View all food <ArrowRight size={16} />
        </Link>
      </Reveal>
      <div className="home-fresh-grid">
        {items.map((item, i) => {
          const f = freshnessOf(item);
          return (
            <Reveal key={item.id} delay={i * 80} className="home-fresh-card">
              <Link to="/browse">
                <div className="home-fresh-media">
                  <img src={imageFor(item.category)} alt={item.category} loading="lazy" />
                  <span className="food-card-chip" style={{ background: f.tint, color: f.color }}>
                    {f.label}
                  </span>
                </div>
                <div className="home-fresh-body">
                  <span className="food-card-category">{item.category}</span>
                  <strong>{item.name}</strong>
                  <div className="home-fresh-meta">
                    <span>
                      <IconPackageBox size={13} color="currentColor" /> {item.quantityKg} kg
                    </span>
                    <span>
                      <IconMapPin size={13} color="currentColor" /> {item.pickupLocation}
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [featured, ...restFeatures] = FEATURES;

  return (
    <div className="home">
      <nav className="home-nav">
        <div className="home-nav-inner">
          <div className="home-brand">
            <BrandWordmark size={22} />
          </div>
          <div className="home-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#impact">Impact</a>
            <Link to="/browse">Available Food</Link>
          </div>
          <div className="home-nav-cta">
            <ThemeToggle />
            <Link to="/login" className="home-btn home-btn-ghost">Log in</Link>
            <Link to="/register" className="home-btn home-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="home-main">
        <header className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <span className="home-eyebrow reveal-fade" style={{ animationDelay: "0ms" }}>
                <IconFloatingLeaf size={16} color="var(--primary)" /> AI-Powered Redistribution
              </span>
              <h1 className="home-hero-title reveal-fade" style={{ animationDelay: "80ms" }}>
                Turn surplus food into someone's <span className="home-hero-highlight">next meal.</span>
              </h1>
              <p className="home-hero-subtitle reveal-fade" style={{ animationDelay: "160ms" }}>
                Zero Waste connects donors, beneficiaries and farm partners in real time —
                matched by AI, confirmed by QR, and measured in kilograms diverted from landfill.
              </p>
              <div className="home-hero-actions reveal-fade" style={{ animationDelay: "240ms" }}>
                <Link to="/register" className="home-btn home-btn-primary home-btn-lg">
                  Get Started Free <ArrowRight size={17} />
                </Link>
                <Link to="/browse" className="home-btn home-btn-outline home-btn-lg">
                  Browse Available Food
                </Link>
              </div>
              <div className="home-hero-roles reveal-fade" style={{ animationDelay: "320ms" }}>
                <div className="home-hero-role-stack">
                  {ROLES.slice(0, 3).map((r) => (
                    <span key={r.title}>
                      <r.Icon size={18} />
                    </span>
                  ))}
                </div>
                <p>
                  Built for <strong>donors</strong>, <strong>NGOs</strong> and <strong>farm partners</strong>
                </p>
              </div>
            </div>

            <div className="home-hero-visual reveal-fade" style={{ animationDelay: "160ms" }}>
              <div className="home-hero-photo" style={{ backgroundImage: "url('/auth-hero.jpg')" }} />
              <div className="home-float home-float-top">
                <span className="home-float-icon">
                  <IconImpact size={20} />
                </span>
                <div>
                  <strong>AI priority matching</strong>
                  <span>Urgency · distance · capacity</span>
                </div>
              </div>
              <div className="home-float home-float-bottom">
                <span className="home-float-icon">
                  <IconScan size={20} />
                </span>
                <div>
                  <strong>Pickup confirmed</strong>
                  <span>Verified by QR ticket</span>
                </div>
              </div>
              <div className="home-float home-float-stat">
                <strong>{STATS[0].value}</strong>
                <span>{STATS[0].label}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="home-categories" aria-label="Food categories">
          {CATEGORIES.map((c) => (
            <Link key={c} to="/browse" className="home-category">
              <img src={CATEGORY_IMAGE[c]} alt="" loading="lazy" />
              <span>{c}</span>
            </Link>
          ))}
        </section>

        <section id="impact" className="home-section">
          <div className="home-stats-row">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="home-stat-card">
                <div className="home-stat-icon">
                  <s.Icon size={26} />
                </div>
                <div>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <FreshListings />

        <section id="features" className="home-section">
          <Reveal className="home-section-head">
            <span className="home-kicker">Features</span>
            <h2 className="home-section-title">
              Everything the <span className="home-hero-highlight">redistribution loop</span> needs
            </h2>
            <p className="home-section-sub">
              One transparent system — from the moment surplus is listed to the moment it's collected.
            </p>
          </Reveal>
          <div className="home-bento">
            <Reveal className="home-bento-card home-bento-feature">
              <div className="home-bento-icon">
                <featured.Icon size={26} />
              </div>
              <h3>{featured.title}</h3>
              <p>{featured.text}</p>
              <Link to="/register" className="home-link-arrow home-link-arrow-light">
                Start matching <ArrowUpRight size={16} />
              </Link>
            </Reveal>
            {restFeatures.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90} className="home-bento-card">
                <div className="home-bento-icon">
                  <f.Icon size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="home-section home-section-alt">
          <Reveal className="home-section-head">
            <span className="home-kicker">How it works</span>
            <h2 className="home-section-title">From surplus shelf to someone's plate</h2>
            <p className="home-section-sub">Four steps, fully tracked from listing to collection.</p>
          </Reveal>
          <div className="home-steps-row">
            {STEPS.map((s, i) => (
              <Reveal key={s.label} delay={i * 100} className="home-step">
                <div className="home-step-top">
                  <div className="home-step-icon">
                    <s.Icon size={26} />
                  </div>
                  <span className="home-step-num">0{i + 1}</span>
                </div>
                <p>{s.label}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="home-section">
          <Reveal className="home-section-head">
            <span className="home-kicker">Who it's for</span>
            <h2 className="home-section-title">Built for every role in the loop</h2>
            <p className="home-section-sub">Each account type gets exactly the tools it needs — nothing more.</p>
          </Reveal>
          <div className="home-role-grid">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 90} className="home-role-card">
                <div className="home-role-icon">
                  <r.Icon size={28} />
                </div>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="home-section">
          <Reveal className="home-cta-banner">
            <div>
              <h2>Ready to reduce food waste?</h2>
              <p>Join as a donor, beneficiary, or farm partner — it takes less than a minute.</p>
            </div>
            <div className="home-cta-actions">
              <Link to="/register" className="home-btn home-btn-light home-btn-lg">
                Create your account <ArrowRight size={17} />
              </Link>
              <Link to="/browse" className="home-btn home-btn-glass home-btn-lg">
                Browse food
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />

      <Chatbot />
    </div>
  );
}
