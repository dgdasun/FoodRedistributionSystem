import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { BrandWordmark } from "../components/Icons.jsx";
import { validateEmail } from "../utils/validation.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    const emailMsg = validateEmail(email);
    setEmailError(emailMsg);
    if (emailMsg) return;
    setLoading(true);
    try {
      const { user } = await api.post("/auth/login", { email: email.trim(), password });
      login(user, { announce: true });
      navigate("/dashboard");
    } catch (e2) {
      setError(e2.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card-split">
        {/* Left Hero Column */}
        <div className="auth-hero-panel">
          <div className="auth-hero-overlay" />
          <div className="auth-hero-content">
            <span className="auth-hero-badge">AI Powered</span>
            <h1 className="auth-hero-title">
              Smart Surplus Food Redistribution and Waste Reduction System
            </h1>
            <p className="auth-hero-subtitle">
              Reducing Waste. Feeding Hope. Building a Sustainable Future. 🌿
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <div className="auth-logo-badge">
              <BrandWordmark size={30} />
            </div>
            <h2>Welcome Back!</h2>
            <p>Sign in to continue</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-input-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="text"
                inputMode="email"
                className="auth-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(validateEmail(e.target.value));
                }}
                onBlur={() => email && setEmailError(validateEmail(email))}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "login-email-error" : undefined}
                style={emailError ? { borderColor: "var(--danger)" } : undefined}
                required
                autoComplete="email"
              />
              {emailError && (
                <p id="login-email-error" role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="auth-input-group">
              <label htmlFor="login-password">Password</label>
              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a
                href="#forgot"
                className="auth-forgot-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Password reset instructions will be sent to your registered email address.");
                }}
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div style={{ color: "var(--danger)", fontSize: 13, textAlign: "center", background: "var(--status-danger-bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--status-danger-border)" }}>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer Link */}
          <p className="auth-footer-text">
            Don't have an account?
            <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
