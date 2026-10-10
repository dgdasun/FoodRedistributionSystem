import React from "react";
import { Link } from "react-router-dom";
import { BrandWordmark } from "./Icons.jsx";

export default function Footer() {
  return (
    <footer className="bg-emerald-950 border-t border-emerald-800/50" style={{ backgroundColor: "#062817" }}>
      <div className="home-footer-inner">
        <div className="home-footer-grid">
          <div className="home-footer-brand">
            <div className="home-brand">
              <BrandWordmark size={26} variant="dark" />
            </div>
            <p className="text-emerald-200/80 text-sm max-w-sm">
              Smart Surplus Food Redistribution &amp; Waste Reduction System
            </p>
            <span className="home-footer-badge">Closing the loop on food waste 🌱</span>
          </div>

          <div className="home-footer-col">
            <h4>Platform</h4>
            <Link to="/browse">Available Food</Link>
            <a href="/#features">Features</a>
            <a href="/#how-it-works">How It Works</a>
            <a href="/#impact">Live Impact</a>
          </div>

          <div className="home-footer-col">
            <h4>Portals</h4>
            <Link to="/register">Donor Hub</Link>
            <Link to="/register">Beneficiary Network</Link>
            <Link to="/register">Farm &amp; Compost Partners</Link>
            <Link to="/login">Admin Login</Link>
          </div>

          <div className="home-footer-col">
            <h4>Legal &amp; Contact</h4>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Safety Standards</a>
          </div>
        </div>

        <div className="home-footer-bottom">
          <p className="text-emerald-400/60">© 2026 Zero Waste Initiative. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
