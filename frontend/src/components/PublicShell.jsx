import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandWordmark } from "./Icons.jsx";
import Chatbot from "./Chatbot.jsx";
import Footer from "./Footer.jsx";

const AUTH_ROUTES = ["/login", "/register"];

export default function PublicShell({ children }) {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="home">
      <nav className="home-nav">
        <div className="home-nav-inner">
          <Link to="/" className="home-brand">
            <BrandWordmark size={22} />
          </Link>
          <div className="home-nav-cta">
            <Link to="/login" className="home-btn home-btn-ghost">Log in</Link>
            <Link to="/register" className="home-btn home-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="home-main" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 60px", width: "100%" }}>
        {children}
      </main>

      {!isAuthRoute && <Footer />}

      <Chatbot />
    </div>
  );
}
