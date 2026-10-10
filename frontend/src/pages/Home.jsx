import React from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import Chatbot from "../components/Chatbot.jsx";
import Footer from "../components/Footer.jsx";
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
  { Icon: IconStepCollect, label: "AI ranks and matches it to the right beneficiary" },
  { Icon: IconStepDistribute, label: "Beneficiary or farm partner requests and is approved" },
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
  { Icon: IconStatCO2, value: "120+", label: "kg CO₂ saved" },
  { Icon: IconStatPeople, value: "5+", label: "communities helped" },
];

export default function Home() {
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
            <Link to="/login" className="home-btn home-btn-ghost">Log in</Link>
            <Link to="/register" className="home-btn home-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="home-main">
      <header className="home-hero">
        <div className="home-hero-bg" style={{ backgroundImage: "url('/auth-hero.jpg')" }} />
        <div className="home-hero-overlay home-hero-overlay-side" />
        <div className="home-hero-overlay home-hero-overlay-bottom" />
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-eyebrow reveal-fade" style={{ animationDelay: "0ms" }}>
              <IconFloatingLeaf size={16} color="#A7F3D0" /> AI-Powered Redistribution
            </span>
            <h1 className="home-hero-title reveal-fade" style={{ animationDelay: "80ms" }}>
              Turn surplus food into someone's next meal.
            </h1>
            <p className="home-hero-subtitle reveal-fade" style={{ animationDelay: "160ms" }}>
              Zero Waste connects donors, beneficiaries and farm partners in real time —
              matched by AI, confirmed by QR, and measured in kilograms diverted from landfill.
            </p>
            <div className="home-hero-actions reveal-fade" style={{ animationDelay: "240ms" }}>
              <Link to="/register" className="home-btn home-btn-primary home-btn-lg">Get Started Free</Link>
              <Link to="/browse" className="home-btn home-btn-glass home-btn-lg">Browse Available Food</Link>
            </div>
          </div>
        </div>
      </header>

      <section id="impact" className="home-section">
        <div className="home-stats-row">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="home-stat-card">
              <div className="home-stat-icon">
                <s.Icon size={28} />
              </div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="relative bg-gradient-to-b from-[#F5F9EF] via-[#E4EFD8]/40 to-[#F5F9EF] border-y border-emerald-200/50 py-24 px-6 sm:px-12">
        <div className="max-w-[1160px] mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14" as="div">
            <h2 className="text-slate-900 font-extrabold text-3xl sm:text-4xl tracking-tight">
              Everything the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-emerald-500">
                redistribution loop
              </span>{" "}
              needs
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto mt-3 text-center">
              One transparent system — from the moment surplus is listed to the moment it's collected.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 90}
                className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-300"
              >
                <div className="bg-[#E4EFD8] text-[#16A34A] w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                  <f.Icon size={24} />
                </div>
                <h3 className="text-slate-900 font-bold text-lg mb-2.5">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="home-section home-section-alt">
        <Reveal className="home-section-head">
          <h2 className="home-section-title">How it works</h2>
          <p className="home-section-sub">Four steps from surplus shelf to someone's plate.</p>
        </Reveal>
        <div className="home-steps-row">
          {STEPS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="home-step">
              <div className="home-step-num">{i + 1}</div>
              <div className="home-step-icon">
                <s.Icon size={28} />
              </div>
              <p>{s.label}</p>
              {i < STEPS.length - 1 && <div className="home-step-connector" />}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Reveal className="home-section-head">
          <h2 className="home-section-title">Built for every role in the loop</h2>
          <p className="home-section-sub">Each account type gets exactly the tools it needs — nothing more.</p>
        </Reveal>
        <div className="home-role-grid">
          {ROLES.map((r, i) => (
            <Reveal key={r.title} delay={i * 90} className="home-role-card">
              <div className="home-role-icon">
                <r.Icon size={30} />
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
          <Link to="/register" className="home-btn home-btn-primary home-btn-lg">Create your account</Link>
        </Reveal>
      </section>
      </main>

      <Footer />

      <Chatbot />
    </div>
  );
}
